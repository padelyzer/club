/**
 * Custom Jest Reporter for BFF Performance Monitoring
 * Tracks and reports performance metrics for BFF endpoints
 */

class BFFPerformanceReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.performanceData = [];
    this.benchmarks = {
      dashboard: 400,    // ms - 67% improvement target
      auth: 300,         // ms - 62% improvement target  
      availability: 200  // ms - 67% improvement target
    };
  }

  onRunStart(results, options) {
    console.log('\n🚀 Starting BFF Light Performance Tests...\n');
    console.log('📊 Performance Targets:');
    console.log(`   Dashboard BFF: < ${this.benchmarks.dashboard}ms`);
    console.log(`   Auth Context: < ${this.benchmarks.auth}ms`);
    console.log(`   Availability: < ${this.benchmarks.availability}ms\n`);
  }

  onTestResult(test, testResult, aggregatedResult) {
    // Extract performance data from test results
    testResult.testResults.forEach(result => {
      if (result.title.includes('performance') || result.title.includes('benchmark')) {
        const performanceMatch = result.title.match(/(\d+)ms/);
        if (performanceMatch) {
          const duration = parseInt(performanceMatch[1]);
          const endpoint = this.extractEndpoint(result.title);
          
          this.performanceData.push({
            endpoint,
            duration,
            benchmark: this.benchmarks[endpoint] || 500,
            passed: duration < (this.benchmarks[endpoint] || 500),
            testName: result.title
          });
        }
      }
    });
  }

  onRunComplete(contexts, results) {
    this.generatePerformanceReport();
    this.generateSummary(results);
  }

  extractEndpoint(testTitle) {
    if (testTitle.toLowerCase().includes('dashboard')) return 'dashboard';
    if (testTitle.toLowerCase().includes('auth')) return 'auth';
    if (testTitle.toLowerCase().includes('availability')) return 'availability';
    return 'unknown';
  }

  generatePerformanceReport() {
    if (this.performanceData.length === 0) return;

    console.log('\n📈 BFF Performance Report');
    console.log('=' * 50);

    const grouped = this.performanceData.reduce((acc, item) => {
      if (!acc[item.endpoint]) acc[item.endpoint] = [];
      acc[item.endpoint].push(item);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([endpoint, data]) => {
      const avgDuration = data.reduce((sum, item) => sum + item.duration, 0) / data.length;
      const benchmark = data[0].benchmark;
      const passedCount = data.filter(item => item.passed).length;
      const improvement = ((benchmark - avgDuration) / benchmark * 100).toFixed(1);
      
      console.log(`\n🎯 ${endpoint.toUpperCase()} BFF:`);
      console.log(`   Average: ${avgDuration.toFixed(1)}ms`);
      console.log(`   Target:  ${benchmark}ms`);
      console.log(`   Status:  ${avgDuration < benchmark ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Improvement: ${improvement > 0 ? '+' : ''}${improvement}%`);
      console.log(`   Success Rate: ${passedCount}/${data.length} (${(passedCount/data.length*100).toFixed(1)}%)`);
    });
  }

  generateSummary(results) {
    const totalTests = results.numTotalTests;
    const passedTests = results.numPassedTests;
    const failedTests = results.numFailedTests;
    
    console.log('\n🎯 BFF Test Summary');
    console.log('=' * 30);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
    
    if (this.performanceData.length > 0) {
      const performancePassed = this.performanceData.filter(item => item.passed).length;
      const performanceTotal = this.performanceData.length;
      console.log(`Performance: ${performancePassed}/${performanceTotal} (${(performancePassed/performanceTotal*100).toFixed(1)}%)`);
    }

    // Production readiness assessment
    const isProductionReady = failedTests === 0 && 
      this.performanceData.every(item => item.passed);
    
    console.log('\n🚀 Production Readiness Assessment');
    console.log('=' * 40);
    console.log(`Status: ${isProductionReady ? '✅ READY FOR PRODUCTION' : '❌ NEEDS ATTENTION'}`);
    
    if (!isProductionReady) {
      console.log('\n⚠️  Issues to Address:');
      if (failedTests > 0) {
        console.log(`   - ${failedTests} functional tests failing`);
      }
      
      const slowEndpoints = this.performanceData.filter(item => !item.passed);
      if (slowEndpoints.length > 0) {
        console.log(`   - ${slowEndpoints.length} performance benchmarks not met`);
        slowEndpoints.forEach(item => {
          console.log(`     • ${item.endpoint}: ${item.duration}ms > ${item.benchmark}ms`);
        });
      }
    }

    console.log('\n');
  }
}

module.exports = BFFPerformanceReporter;