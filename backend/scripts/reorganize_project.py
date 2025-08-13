#!/usr/bin/env python
"""
Script para reorganizar la estructura del proyecto según las mejores prácticas.
Este script ayuda a limpiar y organizar el backend de Padelyzer.
"""
import os
import shutil
from pathlib import Path
from typing import List, Tuple

# Configuración
BASE_DIR = Path(__file__).resolve().parent.parent
DRY_RUN = True  # Cambiar a False para ejecutar realmente los cambios

# Archivos a mover
SCRIPTS_TO_MOVE = [
    "create_*.py",
    "check_*.py",
    "test_*.py",
    "validate_*.py",
    "debug_*.py",
    "setup_*.py",
    "reset_*.py",
    "fix_*.py",
    "simple_*.py",
]

# Archivos a eliminar
FILES_TO_DELETE = [
    "*_broken.py",
    "*_backup.py",
    "*_original.py",
    "*.log",
    "*_test_report*.json",
    "*_validation_results.json",
]

# Directorios a crear
DIRECTORIES_TO_CREATE = [
    "scripts/development",
    "scripts/testing",
    "scripts/deployment",
    "scripts/utilities",
    "docs/api",
    "docs/deployment",
    "docs/architecture",
    "tests/unit",
    "tests/integration",
    "tests/e2e",
]


def create_directories():
    """Crear directorios necesarios."""
    for directory in DIRECTORIES_TO_CREATE:
        dir_path = BASE_DIR / directory
        if not dir_path.exists():
            print(f"Creando directorio: {directory}")
            if not DRY_RUN:
                dir_path.mkdir(parents=True, exist_ok=True)


def get_files_to_move() -> List[Tuple[Path, Path]]:
    """Obtener lista de archivos a mover."""
    moves = []

    # Scripts de desarrollo
    for pattern in SCRIPTS_TO_MOVE:
        for file_path in BASE_DIR.glob(pattern):
            if file_path.is_file() and file_path.parent == BASE_DIR:
                # Determinar destino basado en el nombre
                if "test_" in file_path.name:
                    dest = BASE_DIR / "scripts" / "testing" / file_path.name
                elif "create_" in file_path.name or "setup_" in file_path.name:
                    dest = BASE_DIR / "scripts" / "development" / file_path.name
                elif "deploy" in file_path.name or "production" in file_path.name:
                    dest = BASE_DIR / "scripts" / "deployment" / file_path.name
                else:
                    dest = BASE_DIR / "scripts" / "utilities" / file_path.name

                moves.append((file_path, dest))

    # Documentación
    for md_file in BASE_DIR.glob("*.md"):
        if md_file.name not in ["README.md", "CONTRIBUTING.md", "LICENSE.md"]:
            dest = BASE_DIR / "docs" / md_file.name
            moves.append((md_file, dest))

    return moves


def get_files_to_delete() -> List[Path]:
    """Obtener lista de archivos a eliminar."""
    files = []

    for pattern in FILES_TO_DELETE:
        for file_path in BASE_DIR.glob(pattern):
            if file_path.is_file():
                files.append(file_path)

        # También buscar en subdirectorios de apps
        for file_path in (BASE_DIR / "apps").rglob(pattern):
            if file_path.is_file():
                files.append(file_path)

    return files


def move_files(moves: List[Tuple[Path, Path]]):
    """Mover archivos a sus nuevas ubicaciones."""
    for src, dest in moves:
        print(f"Moviendo: {src.relative_to(BASE_DIR)} → {dest.relative_to(BASE_DIR)}")
        if not DRY_RUN:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dest))


def delete_files(files: List[Path]):
    """Eliminar archivos no deseados."""
    for file_path in files:
        print(f"Eliminando: {file_path.relative_to(BASE_DIR)}")
        if not DRY_RUN:
            file_path.unlink()


def create_init_files():
    """Crear archivos __init__.py en nuevos directorios."""
    for directory in DIRECTORIES_TO_CREATE:
        init_file = BASE_DIR / directory / "__init__.py"
        if not init_file.exists():
            print(f"Creando: {init_file.relative_to(BASE_DIR)}")
            if not DRY_RUN:
                init_file.touch()


def main():
    """Función principal."""
    print(f"Reorganizando proyecto en: {BASE_DIR}")
    print(f"Modo: {'DRY RUN' if DRY_RUN else 'EJECUCIÓN REAL'}")
    print("-" * 50)

    # 1. Crear directorios
    print("\n1. Creando directorios...")
    create_directories()

    # 2. Obtener archivos a mover
    print("\n2. Identificando archivos a mover...")
    moves = get_files_to_move()
    print(f"   Encontrados {len(moves)} archivos para mover")

    # 3. Obtener archivos a eliminar
    print("\n3. Identificando archivos a eliminar...")
    deletes = get_files_to_delete()
    print(f"   Encontrados {len(deletes)} archivos para eliminar")

    # 4. Confirmar acciones
    if not DRY_RUN:
        print(
            "\n⚠️  ADVERTENCIA: Esto realizará cambios reales en el sistema de archivos"
        )
        response = input("¿Continuar? (s/n): ")
        if response.lower() != "s":
            print("Operación cancelada")
            return

    # 5. Ejecutar movimientos
    print("\n4. Moviendo archivos...")
    move_files(moves)

    # 6. Eliminar archivos
    print("\n5. Eliminando archivos...")
    delete_files(deletes)

    # 7. Crear archivos __init__.py
    print("\n6. Creando archivos __init__.py...")
    create_init_files()

    print("\n✅ Reorganización completada")

    if DRY_RUN:
        print("\n⚠️  Este fue un DRY RUN. Para ejecutar realmente los cambios:")
        print("    Cambia DRY_RUN = False en este script")


if __name__ == "__main__":
    main()
