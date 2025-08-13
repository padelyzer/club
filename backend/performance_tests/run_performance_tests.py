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

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from performance_tests.kpi_tracker import PerformanceKPIs


class PerformanceTestRunner:
    """
    Orchestrates performance tests and generates reports.
    """
    
    def __init__(self, base_url="http://localhost:8000", output_dir="performance_results"):
        self.base_url = base_url
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.kpi_tracker = PerformanceKPIs()
        self.results = {}
        
    def run_scenario(self, scenario_name, config):
        """Run a specific performance test scenario."""
        print(f"\n{'='*60}")
        print(f"Running scenario: {scenario_name}")
        print(f"{'='*60}")
        
        # Prepare Locust command
        if 'custom_test' in config:
            locust_file = f"scenarios/{config['custom_test']}"
        else:
            locust_file = "locustfile.py"
        
        cmd = [
            "locust",
            "-f", locust_file,
            "--host", self.base_url,
            "--users", str(config.get('users', 100)),
            "--spawn-rate", str(config.get('spawn_rate', 10)),
            "--run-time", config.get('duration', '5m'),
            "--headless",
            "--html", str(self.output_dir / f"{scenario_name}_report.html"),
            "--csv", str(self.output_dir / f"{scenario_name}_stats"),
            "--loglevel", "INFO"
        ]
        
        # Add stage-based configuration if present
        if 'stages' in config:
            stages_file = self.output_dir / f"{scenario_name}_stages.json"
            with open(stages_file, 'w') as f:
                json.dump(config['stages'], f)
            cmd.extend(["--config", str(stages_file)])
        
        # Start test
        start_time = time.time()
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Monitor test progress
        self._monitor_test(process, scenario_name)
        
        # Wait for completion
        stdout, stderr = process.communicate()
        duration = time.time() - start_time
        
        # Parse results
        results = self._parse_locust_stats(scenario_name)
        results['duration'] = duration
        results['scenario_config'] = config
        
        self.results[scenario_name] = results
        
        # Check if test passed
        passed = self._check_scenario_passed(results)
        
        print(f"\nScenario '{scenario_name}' completed in {duration:.1f}s - {'PASSED' if passed else 'FAILED'}")
        
        return passed
    
    def _monitor_test(self, process, scenario_name):
        """Monitor running test and display progress."""
        # This would normally tail the Locust logs and display progress
        # For now, just show a simple progress indicator
        import threading
        
        def show_progress():
            chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
            i = 0
            while process.poll() is None:
                print(f"\r{chars[i % len(chars)]} Running {scenario_name}...", end='', flush=True)
                i += 1
                time.sleep(0.1)
            print("\r✓ Test completed", flush=True)
        
        progress_thread = threading.Thread(target=show_progress)
        progress_thread.daemon = True
        progress_thread.start()
    
    def _parse_locust_stats(self, scenario_name):
        """Parse Locust statistics CSV files."""
        stats_file = self.output_dir / f"{scenario_name}_stats_stats.csv"
        
        if not stats_file.exists():
            return {}
        
        import csv
        
        results = {
            'requests': {},
            'failures': [],
            'response_times': {},
            'summary': {}
        }
        
        # Parse main stats
        with open(stats_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                endpoint = row['Name']
                if endpoint != 'Aggregated':
                    results['requests'][endpoint] = {
                        'count': int(row['Request Count']),
                        'failure_count': int(row['Failure Count']),
                        'median_response_time': float(row['Median Response Time']),
                        'average_response_time': float(row['Average Response Time']),
                        'p95_response_time': float(row['95%']),
                        'p99_response_time': float(row['99%']),
                        'rps': float(row['Requests/s']),
                    }
                else:
                    # Aggregated stats
                    results['summary'] = {
                        'total_requests': int(row['Request Count']),
                        'total_failures': int(row['Failure Count']),
                        'median_response_time': float(row['Median Response Time']),
                        'average_response_time': float(row['Average Response Time']),
                        'p95_response_time': float(row['95%']),
                        'p99_response_time': float(row['99%']),
                        'rps': float(row['Requests/s']),
                        'failure_rate': float(row['Failure Count']) / float(row['Request Count']) if int(row['Request Count']) > 0 else 0
                    }
        
        # Parse failures if any
        failures_file = self.output_dir / f"{scenario_name}_stats_failures.csv"
        if failures_file.exists():
            with open(failures_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results['failures'].append({
                        'method': row['Method'],
                        'endpoint': row['Name'],
                        'error': row['Error'],
                        'occurrences': int(row['Occurrences'])
                    })
        
        return results
    
    def _check_scenario_passed(self, results):
        """Check if scenario met performance criteria."""
        if not results or 'summary' not in results:
            return False
        
        summary = results['summary']
        
        # Check against KPIs
        checks = [
            summary['p95_response_time'] <= self.kpi_tracker.TARGETS['api_response_time_p95'],
            summary['p99_response_time'] <= self.kpi_tracker.TARGETS['api_response_time_p99'],
            summary['failure_rate'] <= self.kpi_tracker.TARGETS['error_rate'],
            summary['rps'] >= 10,  # Minimum throughput
        ]
        
        return all(checks)
    
    def run_all_scenarios(self, scenario_file="scenarios.yaml"):
        """Run all scenarios from configuration file."""
        # Load scenarios
        with open(scenario_file, 'r') as f:
            config = yaml.safe_load(f)
        
        scenarios = config.get('scenarios', [])
        
        print(f"Found {len(scenarios)} scenarios to run")
        
        # Run each scenario
        passed_count = 0
        for scenario in scenarios:
            scenario_name = scenario['name']
            passed = self.run_scenario(scenario_name, scenario)
            if passed:
                passed_count += 1
            
            # Cool down between scenarios
            print("Cooling down for 30 seconds...")
            time.sleep(30)
        
        # Generate final report
        self.generate_report()
        
        print(f"\n{'='*60}")
        print(f"Performance Test Summary: {passed_count}/{len(scenarios)} scenarios passed")
        print(f"{'='*60}")
        
        return passed_count == len(scenarios)
    
    def generate_report(self):
        """Generate comprehensive performance test report."""
        report_file = self.output_dir / f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Compile report
        report = {
            'timestamp': datetime.now().isoformat(),
            'environment': {
                'base_url': self.base_url,
                'python_version': sys.version,
            },
            'scenarios': self.results,
            'kpi_compliance': self._check_kpi_compliance(),
            'recommendations': self._generate_recommendations()
        }
        
        # Save JSON report
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate HTML report
        self._generate_html_report(report)
        
        # Print summary
        self._print_summary(report)
        
        return report_file
    
    def _check_kpi_compliance(self):
        """Check overall KPI compliance across all scenarios."""
        compliance = {}
        
        for kpi_name, target_value in self.kpi_tracker.TARGETS.items():
            values = []
            
            # Collect values from all scenarios
            for scenario_name, results in self.results.items():
                if 'summary' in results:
                    summary = results['summary']
                    
                    if 'response_time_p95' in kpi_name:
                        values.append(summary.get('p95_response_time', 0))
                    elif 'response_time_p99' in kpi_name:
                        values.append(summary.get('p99_response_time', 0))
                    elif 'error_rate' in kpi_name:
                        values.append(summary.get('failure_rate', 0))
                    elif 'requests_per_second' in kpi_name:
                        values.append(summary.get('rps', 0))
            
            if values:
                avg_value = sum(values) / len(values)
                if 'error_rate' in kpi_name or 'response_time' in kpi_name:
                    # Lower is better
                    compliant = avg_value <= target_value
                else:
                    # Higher is better
                    compliant = avg_value >= target_value
                
                compliance[kpi_name] = {
                    'target': target_value,
                    'actual': avg_value,
                    'compliant': compliant
                }
        
        return compliance
    
    def _generate_recommendations(self):
        """Generate performance optimization recommendations."""
        recommendations = []
        
        # Analyze results
        total_failures = sum(
            r.get('summary', {}).get('total_failures', 0) 
            for r in self.results.values()
        )
        
        avg_p95 = sum(
            r.get('summary', {}).get('p95_response_time', 0) 
            for r in self.results.values()
        ) / len(self.results) if self.results else 0
        
        # Generate recommendations
        if total_failures > 100:
            recommendations.append({
                'severity': 'HIGH',
                'area': 'Reliability',
                'issue': f'High failure count ({total_failures} total failures)',
                'recommendation': 'Investigate error logs and improve error handling'
            })
        
        if avg_p95 > 300:
            recommendations.append({
                'severity': 'MEDIUM',
                'area': 'Performance',
                'issue': f'High P95 response time ({avg_p95:.0f}ms)',
                'recommendation': 'Implement caching and optimize database queries'
            })
        
        # Check for specific endpoint issues
        slow_endpoints = []
        for scenario_name, results in self.results.items():
            for endpoint, stats in results.get('requests', {}).items():
                if stats['p95_response_time'] > 500:
                    slow_endpoints.append((endpoint, stats['p95_response_time']))
        
        if slow_endpoints:
            recommendations.append({
                'severity': 'MEDIUM',
                'area': 'Endpoint Performance',
                'issue': f'{len(slow_endpoints)} slow endpoints detected',
                'recommendation': f'Optimize these endpoints: {", ".join(ep[0] for ep in slow_endpoints[:3])}'
            })
        
        return recommendations
    
    def _generate_html_report(self, report):
        """Generate HTML performance report."""
        html_file = self.output_dir / f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Padelyzer Performance Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1, h2, h3 {{ color: #333; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .passed {{ color: green; }}
                .failed {{ color: red; }}
                .warning {{ color: orange; }}
                .metric {{ font-family: monospace; }}
            </style>
        </head>
        <body>
            <h1>Padelyzer Performance Test Report</h1>
            <p>Generated: {report['timestamp']}</p>
            
            <h2>Executive Summary</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Status</th>
                </tr>
        """
        
        # Add KPI compliance
        for kpi_name, kpi_data in report['kpi_compliance'].items():
            status_class = 'passed' if kpi_data['compliant'] else 'failed'
            html_content += f"""
                <tr>
                    <td>{kpi_name}</td>
                    <td class="metric">{kpi_data['actual']:.2f} (target: {kpi_data['target']})</td>
                    <td class="{status_class}">{'PASS' if kpi_data['compliant'] else 'FAIL'}</td>
                </tr>
            """
        
        html_content += """
            </table>
            
            <h2>Scenario Results</h2>
        """
        
        # Add scenario results
        for scenario_name, results in report['scenarios'].items():
            summary = results.get('summary', {})
            html_content += f"""
            <h3>{scenario_name}</h3>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Total Requests</td>
                    <td class="metric">{summary.get('total_requests', 0):,}</td>
                </tr>
                <tr>
                    <td>Requests/Second</td>
                    <td class="metric">{summary.get('rps', 0):.1f}</td>
                </tr>
                <tr>
                    <td>P95 Response Time</td>
                    <td class="metric">{summary.get('p95_response_time', 0):.0f}ms</td>
                </tr>
                <tr>
                    <td>Error Rate</td>
                    <td class="metric">{summary.get('failure_rate', 0)*100:.2f}%</td>
                </tr>
            </table>
            """
        
        # Add recommendations
        if report['recommendations']:
            html_content += "<h2>Recommendations</h2><ul>"
            for rec in report['recommendations']:
                html_content += f"""
                <li>
                    <strong>[{rec['severity']}] {rec['area']}:</strong> {rec['issue']}<br>
                    <em>Recommendation:</em> {rec['recommendation']}
                </li>
                """
            html_content += "</ul>"
        
        html_content += """
        </body>
        </html>
        """
        
        with open(html_file, 'w') as f:
            f.write(html_content)
        
        print(f"HTML report saved to: {html_file}")
    
    def _print_summary(self, report):
        """Print summary to console."""
        print("\n" + "="*60)
        print("PERFORMANCE TEST SUMMARY")
        print("="*60)
        
        # KPI Compliance Table
        kpi_data = []
        for kpi_name, kpi_info in report['kpi_compliance'].items():
            kpi_data.append([
                kpi_name,
                f"{kpi_info['actual']:.2f}",
                f"{kpi_info['target']}",
                "✓ PASS" if kpi_info['compliant'] else "✗ FAIL"
            ])
        
        print("\nKPI Compliance:")
        print(tabulate(kpi_data, headers=['KPI', 'Actual', 'Target', 'Status'], tablefmt='grid'))
        
        # Scenario Summary
        scenario_data = []
        for scenario_name, results in report['scenarios'].items():
            summary = results.get('summary', {})
            scenario_data.append([
                scenario_name,
                f"{summary.get('total_requests', 0):,}",
                f"{summary.get('rps', 0):.1f}",
                f"{summary.get('p95_response_time', 0):.0f}ms",
                f"{summary.get('failure_rate', 0)*100:.2f}%"
            ])
        
        print("\nScenario Results:")
        print(tabulate(scenario_data, 
                      headers=['Scenario', 'Requests', 'RPS', 'P95 RT', 'Error Rate'],
                      tablefmt='grid'))
        
        # Recommendations
        if report['recommendations']:
            print("\nKey Recommendations:")
            for i, rec in enumerate(report['recommendations'][:3], 1):
                print(f"{i}. [{rec['severity']}] {rec['area']}: {rec['recommendation']}")


@click.command()
@click.option('--url', default='http://localhost:8000', help='Base URL for testing')
@click.option('--scenario', help='Run specific scenario')
@click.option('--output-dir', default='performance_results', help='Output directory')
@click.option('--lighthouse', is_flag=True, help='Also run Lighthouse tests')
def main(url, scenario, output_dir, lighthouse):
    """Run Padelyzer performance tests."""
    runner = PerformanceTestRunner(base_url=url, output_dir=output_dir)
    
    if scenario:
        # Run single scenario
        with open('scenarios.yaml', 'r') as f:
            config = yaml.safe_load(f)
        
        scenario_config = next(
            (s for s in config['scenarios'] if s['name'] == scenario),
            None
        )
        
        if not scenario_config:
            print(f"Scenario '{scenario}' not found")
            sys.exit(1)
        
        passed = runner.run_scenario(scenario, scenario_config)
        runner.generate_report()
    else:
        # Run all scenarios
        passed = runner.run_all_scenarios()
    
    # Run Lighthouse tests if requested
    if lighthouse:
        print("\nRunning Lighthouse tests...")
        subprocess.run([
            "npx", "lhci", "autorun",
            "--config", "../frontend/performance_tests/lighthouse-ci.config.js"
        ])
    
    sys.exit(0 if passed else 1)


if __name__ == '__main__':
    main()