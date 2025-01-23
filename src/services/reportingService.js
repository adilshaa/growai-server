const config = require('../../new.json');

class ReportingService {
    constructor() {
        this.metrics = [];
        this.config = config.aiModelEvaluationSystem.reporting;
    }

    async recordResult(result) {
        const aggregatedMetrics = this._aggregateMetrics(result);
        this.metrics.push({
            ...aggregatedMetrics,
            timestamp: new Date().toISOString()
        });
        
        return aggregatedMetrics;
    }

    async recordBatchResults(results) {
        const batchMetrics = results.map(result => this._aggregateMetrics(result));
        const aggregated = this._aggregateBatchMetrics(batchMetrics);
        
        this.metrics.push({
            ...aggregated,
            timestamp: new Date().toISOString(),
            batchSize: results.length
        });

        return aggregated;
    }

    async getMetrics(filters = {}) {
        let filteredMetrics = [...this.metrics];

        if (filters.startDate) {
            filteredMetrics = filteredMetrics.filter(m => 
                new Date(m.timestamp) >= new Date(filters.startDate)
            );
        }

        if (filters.endDate) {
            filteredMetrics = filteredMetrics.filter(m => 
                new Date(m.timestamp) <= new Date(filters.endDate)
            );
        }

        return {
            metrics: filteredMetrics,
            summary: this._calculateSummary(filteredMetrics)
        };
    }

    _aggregateMetrics(result) {
        return {
            accuracy_score: result.metrics.accuracy.overall,
            response_time: result.executionTime,
            token_usage: this._calculateTokenUsage(result.response),
            error_rate: result.metrics.quality.overall < 0.7 ? 1 : 0,
            consistency_score: (result.metrics.accuracy.overall + result.metrics.quality.overall) / 2
        };
    }

    _aggregateBatchMetrics(batchMetrics) {
        const keys = Object.keys(batchMetrics[0]);
        const aggregated = {};

        keys.forEach(key => {
            if (key !== 'timestamp') {
                aggregated[key] = batchMetrics.reduce((sum, metric) => 
                    sum + metric[key], 0) / batchMetrics.length;
            }
        });

        return aggregated;
    }

    _calculateTokenUsage(response) {
        return response.split(/\s+/).length;
    }

    _calculateSummary(metrics) {
        const keys = Object.keys(metrics[0] || {}).filter(k => k !== 'timestamp');
        const summary = {};

        keys.forEach(key => {
            const values = metrics.map(m => m[key]);
            summary[key] = {
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });

        return summary;
    }
}

module.exports = new ReportingService();
