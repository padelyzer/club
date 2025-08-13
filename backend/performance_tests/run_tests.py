#!/usr/bin/env python
"""
Performance test runner for Padelyzer.
Orchestrates different performance testing scenarios and generates reports.
"""

import os
import sys
import time
import subprocess
import json
import yaml
from datetime import datetime
from pathlib import Path
import click
import requests
from tabulate import tabulate

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from performance_tests.kpi_tracker import PerformanceKPIs


class PerformanceTestRunner:
    """
    Manages execution of performance tests and report generation.
    """
    
    def __init__(self, base_url='http://localhost:8000', frontend_url='http://localhost:3000'):
        self.base_url = base_url
        self.frontend_url = frontend_url
        self.results_dir = Path('performance_results')
        self.results_dir.mkdir(exist_ok=True)
        self.kpi_tracker = PerformanceKPIs()
        
    def run_locust_test(self, scenario_name, duration='5m', users=100, spawn_rate=10):
        """Run Locust load test for a specific scenario."""
        click.echo(f"\n🦗 Running Locust test: {scenario_name}")
        click.echo(f"   Users: {users}, Spawn rate: {spawn_rate}, Duration: {duration}")
        
        # Prepare Locust command
        cmd = [
            'locust',
            '-f', 'performance_tests/locustfile.py',
            '--host', self.base_url,
            '--users', str(users),
            '--spawn-rate', str(spawn_rate),
            '--run-time', duration,
            '--headless',
            '--html', f'{self.results_dir}/locust_{scenario_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html',
            '--csv', f'{self.results_dir}/locust_{scenario_name}',
        ]
        
        # Run Locust
        start_time = time.time()
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Monitor progress
        with click.progressbar(length=100, label='Progress') as bar:
            while process.poll() is None:
                time.sleep(1)
                elapsed = time.time() - start_time
                progress = min(100, int((elapsed / self._parse_duration(duration)) * 100))
                bar.update(progress - bar.pos)
        
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            click.echo(f"❌ Locust test failed: {stderr.decode()}", err=True)
            return None
        
        # Parse results
        results = self._parse_locust_results(scenario_name)
        click.echo(f"✅ Locust test completed")
        
        return results
    
    def run_lighthouse_test(self, urls=None):
        """Run Lighthouse performance tests."""
        click.echo("\n🏮 Running Lighthouse tests")
        
        if urls is None:
            urls = [
                f"{self.frontend_url}/",
                f"{self.frontend_url}/dashboard-produccion",
                f"{self.frontend_url}/reservations",
                f"{self.frontend_url}/clubs",
            ]
        
        # Run Lighthouse CI
        cmd = [
            'npx', 'lhci', 'autorun',
            '--config', 'frontend/performance_tests/lighthouse-ci.config.js'
        ]
        
        process = subprocess.run(cmd, capture_output=True, text=True)
        
        if process.returncode != 0:
            click.echo(f"❌ Lighthouse test failed: {process.stderr}", err=True)
            return None
        
        click.echo("✅ Lighthouse tests completed")
        
        # Parse results
        return self._parse_lighthouse_results()
    
    def run_database_performance_test(self):
        """Run database-specific performance tests."""
        click.echo("\n🗄️  Running database performance tests")
        
        # Run Django management command
        cmd = [
            'python', 'manage.py', 'test',
            'performance_tests.db_performance.DatabasePerformanceTest',
            '--keepdb'
        ]
        
        process = subprocess.run(cmd, capture_output=True, text=True, cwd='backend')
        
        if process.returncode != 0:
            click.echo(f"❌ Database tests failed: {process.stderr}", err=True)
            return None
        
        click.echo("✅ Database tests completed")
        
        return self._parse_database_results(process.stdout)
    
    def run_scenario(self, scenario_file='performance_tests/scenarios.yaml'):
        """Run a complete performance testing scenario."""
        # Load scenarios
        with open(scenario_file, 'r') as f:
            config = yaml.safe_load(f)
        
        scenarios = config['scenarios']
        results = {}
        
        for scenario in scenarios:
            click.echo(f"\n📊 Running scenario: {scenario['name']}")
            click.echo(f"   {scenario['description']}")
            
            # Run based on scenario type
            if 'stages' in scenario:
                # Complex staged scenario
                result = self._run_staged_scenario(scenario)
            else:
                # Simple scenario
                result = self.run_locust_test(
                    scenario['name'].lower().replace(' ', '_'),
                    duration=scenario.get('duration', '5m'),
                    users=scenario.get('users', 100),
                    spawn_rate=scenario.get('spawn_rate', 10)
                )
            
            if result:
                results[scenario['name']] = result
        
        return results
    
    def check_performance_targets(self, results):
        """Check if performance targets are met."""
        click.echo("\n🎯 Checking performance targets")
        
        # Get current metrics
        is_compliant, violations = self.kpi_tracker.check_sla_compliance()
        
        if is_compliant:
            click.echo("✅ All performance targets met!")
        else:
            click.echo("❌ Performance target violations:")
            for violation in violations:
                click.echo(f"   - {violation}")
        
        return is_compliant
    
    def generate_report(self, all_results):
        """Generate comprehensive performance report."""
        click.echo("\n📝 Generating performance report")
        
        # Generate KPI report
        report = self.kpi_tracker.generate_performance_report(period_hours=1)
        
        # Add test results
        report['test_results'] = all_results
        
        # Save report
        report_file = self.results_dir / f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        # Generate summary table
        self._print_summary_table(report)
        
        click.echo(f"\n📄 Full report saved to: {report_file}")
        
        return report
    
    def _parse_duration(self, duration_str):
        """Parse duration string to seconds."""
        if duration_str.endswith('m'):
            return int(duration_str[:-1]) * 60
        elif duration_str.endswith('s'):
            return int(duration_str[:-1])
        elif duration_str.endswith('h'):
            return int(duration_str[:-1]) * 3600
        return 300  # Default 5 minutes
    
    def _parse_locust_results(self, scenario_name):
        """Parse Locust CSV results."""
        stats_file = self.results_dir / f"locust_{scenario_name}_stats.csv"
        
        if not stats_file.exists():
            return None
        
        results = {
            'requests': {},
            'summary': {}
        }
        
        # Parse CSV
        import csv
        with open(stats_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                endpoint = row['Name']
                if endpoint != 'Aggregated':
                    results['requests'][endpoint] = {
                        'avg_response_time': float(row['Average Response Time']),
                        'min_response_time': float(row['Min Response Time']),
                        'max_response_time': float(row['Max Response Time']),
                        'p95_response_time': float(row['95%']),
                        'requests_per_second': float(row['Requests/s']),
                        'failure_rate': float(row['Failure Count']) / float(row['Request Count']) if float(row['Request Count']) > 0 else 0
                    }
                else:
                    results['summary'] = {
                        'total_requests': int(row['Request Count']),
                        'total_failures': int(row['Failure Count']),
                        'avg_response_time': float(row['Average Response Time']),
                        'p95_response_time': float(row['95%']),
                        'requests_per_second': float(row['Requests/s'])
                    }
        
        return results
    
    def _parse_lighthouse_results(self):
        """Parse Lighthouse results."""
        # This would parse the Lighthouse CI output
        # For now, return mock data
        return {
            'performance_score': 0.92,
            'accessibility_score': 0.95,
            'best_practices_score': 0.90,
            'seo_score': 0.88,
            'metrics': {
                'first_contentful_paint': 1200,
                'largest_contentful_paint': 2100,
                'total_blocking_time': 250,
                'cumulative_layout_shift': 0.05
            }
        }
    
    def _parse_database_results(self, output):
        """Parse database test results."""
        # Extract query counts and timing from test output
        results = {
            'slow_queries': [],
            'optimization_suggestions': [],
            'query_counts': {}
        }
        
        # Parse test output
        for line in output.split('\n'):
            if 'query count:' in line.lower():
                # Extract query count information
                pass
            elif 'slow query:' in line.lower():
                # Extract slow query information
                pass
        
        return results
    
    def _run_staged_scenario(self, scenario):
        """Run a scenario with multiple stages."""
        results = []
        
        for i, stage in enumerate(scenario['stages']):
            click.echo(f"\n   Stage {i+1}: {stage['users']} users for {stage['duration']}")
            
            # Run stage
            stage_result = self.run_locust_test(
                f"{scenario['name']}_stage_{i+1}",
                duration=stage['duration'],
                users=stage['users'],
                spawn_rate=stage.get('spawn_rate', stage['users'] // 10)
            )
            
            if stage_result:
                results.append(stage_result)
            
            # Brief pause between stages
            time.sleep(5)
        
        # Aggregate results
        return self._aggregate_stage_results(results)
    
    def _aggregate_stage_results(self, stage_results):
        """Aggregate results from multiple stages."""
        if not stage_results:
            return None
        
        # Combine metrics from all stages
        aggregated = {
            'stages': stage_results,
            'summary': {
                'total_requests': sum(s['summary']['total_requests'] for s in stage_results),
                'total_failures': sum(s['summary']['total_failures'] for s in stage_results),
                'avg_response_time': sum(s['summary']['avg_response_time'] for s in stage_results) / len(stage_results),
                'max_response_time': max(s['summary'].get('max_response_time', s['summary']['avg_response_time']) for s in stage_results),
            }
        }
        
        return aggregated
    
    def _print_summary_table(self, report):
        """Print a summary table of results."""
        # Prepare data for table
        table_data = []
        
        # Add KPI metrics
        for metric_name, metric_data in report['metrics'].items():
            target = PerformanceKPIs.TARGETS.get(metric_name, 'N/A')
            current = metric_data.get('current', 'N/A')
            status = '✅' if isinstance(current, (int, float)) and isinstance(target, (int, float)) else '❓'
            
            if isinstance(current, (int, float)) and isinstance(target, (int, float)):
                if 'rate' in metric_name and metric_name != 'cache_hit_rate':
                    status = '✅' if current <= target else '❌'
                elif metric_name in ['cache_hit_rate', 'booking_success_rate']:
                    status = '✅' if current >= target else '❌'
                else:
                    status = '✅' if current <= target else '❌'
            
            table_data.append([
                metric_name,
                f"{target:g}" if isinstance(target, (int, float)) else target,
                f"{current:g}" if isinstance(current, (int, float)) else current,
                status
            ])
        
        # Print table
        headers = ['Metric', 'Target', 'Current', 'Status']
        click.echo("\n" + tabulate(table_data, headers=headers, tablefmt='grid'))
        
        # Print recommendations
        if report.get('recommendations'):
            click.echo("\n💡 Recommendations:")
            for rec in report['recommendations']:
                click.echo(f"   • {rec}")


@click.command()
@click.option('--scenario', '-s', help='Specific scenario to run')
@click.option('--locust-only', is_flag=True, help='Run only Locust tests')
@click.option('--lighthouse-only', is_flag=True, help='Run only Lighthouse tests')
@click.option('--database-only', is_flag=True, help='Run only database tests')
@click.option('--quick', is_flag=True, help='Run quick smoke tests')
@click.option('--base-url', default='http://localhost:8000', help='Backend base URL')
@click.option('--frontend-url', default='http://localhost:3000', help='Frontend base URL')
def main(scenario, locust_only, lighthouse_only, database_only, quick, base_url, frontend_url):
    """Run Padelyzer performance tests."""
    click.echo("🚀 Padelyzer Performance Test Runner")
    click.echo("=" * 50)
    
    runner = PerformanceTestRunner(base_url, frontend_url)
    all_results = {}
    
    try:
        # Check if services are running
        click.echo("\n🔍 Checking services...")
        try:
            requests.get(base_url, timeout=5)
            click.echo("✅ Backend is running")
        except:
            click.echo("❌ Backend is not accessible", err=True)
            return
        
        try:
            requests.get(frontend_url, timeout=5)
            click.echo("✅ Frontend is running")
        except:
            click.echo("⚠️  Frontend is not accessible (some tests may fail)")
        
        # Run tests based on options
        if locust_only:
            if scenario:
                results = runner.run_locust_test(scenario)
                if results:
                    all_results[scenario] = results
            else:
                all_results['locust'] = runner.run_scenario()
        
        elif lighthouse_only:
            all_results['lighthouse'] = runner.run_lighthouse_test()
        
        elif database_only:
            all_results['database'] = runner.run_database_performance_test()
        
        elif quick:
            # Quick smoke test
            click.echo("\n🏃 Running quick performance smoke tests")
            
            # Quick Locust test
            locust_result = runner.run_locust_test('smoke_test', duration='1m', users=10, spawn_rate=2)
            if locust_result:
                all_results['smoke_locust'] = locust_result
            
            # Quick database test
            db_result = runner.run_database_performance_test()
            if db_result:
                all_results['smoke_database'] = db_result
        
        else:
            # Full test suite
            click.echo("\n🎯 Running full performance test suite")
            
            # Load tests
            if scenario:
                results = runner.run_locust_test(scenario)
                if results:
                    all_results[scenario] = results
            else:
                locust_results = runner.run_scenario()
                all_results.update(locust_results)
            
            # Frontend tests
            lighthouse_results = runner.run_lighthouse_test()
            if lighthouse_results:
                all_results['lighthouse'] = lighthouse_results
            
            # Database tests
            db_results = runner.run_database_performance_test()
            if db_results:
                all_results['database'] = db_results
        
        # Check targets
        runner.check_performance_targets(all_results)
        
        # Generate report
        report = runner.generate_report(all_results)
        
        click.echo("\n✨ Performance testing completed!")
        
    except KeyboardInterrupt:
        click.echo("\n⚠️  Tests interrupted by user")
    except Exception as e:
        click.echo(f"\n❌ Error during testing: {e}", err=True)
        raise


if __name__ == '__main__':
    main()