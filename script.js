let benefitChart;

window.onload = function() {
    const savedInputs = JSON.parse(localStorage.getItem('evaluatorInputs')) || {};
    document.getElementById('balance').value = savedInputs.balance || '';
    document.getElementById('daily-investment').value = savedInputs.dailyInvestment || '';
    document.getElementById('trading-days').value = savedInputs.tradingDays || '';
    document.getElementById('ira-contribution').value = savedInputs.iraContribution || '';
    document.getElementById('apy').value = savedInputs.apy || '';
    document.getElementById('fee').value = savedInputs.fee || '';
    document.getElementById('match').value = savedInputs.match || '';
    document.getElementById('years').value = savedInputs.years || 1;
};

function loadPreset(type) {
    let values;
    switch (type) {
        case 'robinhood':
            values = { apy: 4.9, fee: 60, match: 1 };
            break;
        case 'fidelity':
            values = { apy: 4.0, fee: 100, match: 2 };
            break;
        case 'custom':
        default:
            values = { apy: '', fee: '', match: '' };
            break;
    }
    document.getElementById('apy').value = values.apy;
    document.getElementById('fee').value = values.fee;
    document.getElementById('match').value = values.match;
}

document.getElementById('evaluator-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const balance = parseFloat(document.getElementById('balance').value);
    const dailyInvestment = parseFloat(document.getElementById('daily-investment').value);
    const tradingDays = parseInt(document.getElementById('trading-days').value);
    const iraContribution = parseFloat(document.getElementById('ira-contribution').value);
    const apy = parseFloat(document.getElementById('apy').value) / 100;
    const fee = parseFloat(document.getElementById('fee').value);
    const match = parseFloat(document.getElementById('match').value) / 100;
    const years = parseInt(document.getElementById('years').value);

    if (isNaN(balance) || balance < 0) return alert('Please enter a valid starting balance.');
    if (isNaN(dailyInvestment) || dailyInvestment < 0) return alert('Please enter a valid daily investment.');
    if (isNaN(tradingDays) || tradingDays < 0 || tradingDays > 31) return alert('Trading days must be between 0 and 31.');
    if (isNaN(iraContribution) || iraContribution < 0) return alert('Please enter a valid IRA contribution.');
    if (isNaN(apy) || apy < 0) return alert('Please enter a valid APY.');
    if (isNaN(fee) || fee < 0) return alert('Please enter a valid fee.');
    if (isNaN(match) || match < 0) return alert('Please enter a valid match percentage.');
    if (isNaN(years) || years < 1) return alert('Years must be 1 or greater.');

    const inputs = { balance, dailyInvestment, tradingDays, iraContribution, apy: apy * 100, fee, match: match * 100, years };
    localStorage.setItem('evaluatorInputs', JSON.stringify(inputs));

    const daysInMonth = 30;
    const monthsInYear = 12;

    const daysToDeplete = Math.min(Math.floor(balance / dailyInvestment) || 0, tradingDays);
    const avgBalanceFirstPhase = daysToDeplete > 0 ? (balance + (balance - dailyInvestment * daysToDeplete)) / 2 : 0;
    const remainingDays = daysInMonth - daysToDeplete;
    const avgBalance = (avgBalanceFirstPhase * daysToDeplete) / daysInMonth;

    const dailyRate = (1 + apy) ** (1 / 365) - 1;
    const monthlyInterest = avgBalance * dailyRate * daysInMonth;
    const annualInterest = monthlyInterest * monthsInYear;

    const annualIraContribution = iraContribution * monthsInYear;
    const annualMatch = annualIraContribution * match;

    const totalBenefit = annualInterest + annualMatch;
    const net = totalBenefit - fee;

    const multiYearNet = net * years;

    const breakEvenBalance = (fee - annualMatch) / (dailyRate * daysInMonth * monthsInYear) * daysInMonth / daysToDeplete;
    const breakEvenIra = (fee - annualInterest) / (match * monthsInYear);

    document.getElementById('interest').textContent = `$${annualInterest.toFixed(2)}`;
    document.getElementById('match-value').textContent = `$${annualMatch.toFixed(2)}`;
    document.getElementById('total-benefit').textContent = `$${totalBenefit.toFixed(2)}`;
    document.getElementById('net').textContent = `$${net.toFixed(2)}`;
    document.getElementById('years-display').textContent = years;
    document.getElementById('multi-year-net').textContent = `$${multiYearNet.toFixed(2)}`;
    document.getElementById('break-even-balance').textContent = isFinite(breakEvenBalance) && breakEvenBalance > 0 ? `$${breakEvenBalance.toFixed(2)}` : 'N/A';
    document.getElementById('break-even-ira').textContent = isFinite(breakEvenIra) && breakEvenIra > 0 ? `$${breakEvenIra.toFixed(2)}` : 'N/A';

    const verdict = document.getElementById('verdict');
    if (net >= 0) {
        verdict.textContent = 'Worth it!';
        verdict.classList.remove('negative');
    } else {
        verdict.textContent = 'Not worth it.';
        verdict.classList.add('negative');
    }

    if (typeof Chart === 'undefined') {
        alert('Chart.js failed to load. Please check your internet connection or try again later.');
        document.getElementById('benefitChart').style.display = 'none';
    } else {
        document.getElementById('benefitChart').style.display = 'block';
        if (benefitChart) benefitChart.destroy();
        const ctx = document.getElementById('benefitChart').getContext('2d');
        benefitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Interest', 'IRA Match', 'Fee', 'Net (Year 1)', `Net (${years} Years)`],
                datasets: [{
                    label: 'Amount ($)',
                    data: [annualInterest, annualMatch, -fee, net, multiYearNet],
                    backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', net >= 0 ? '#4BC0C0' : '#FF6384', multiYearNet >= 0 ? '#9966FF' : '#FF6384']
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Amount ($)' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Show overlay and hide form
    document.getElementById('results-overlay').classList.remove('hidden');
    document.getElementById('evaluator-form').classList.add('hidden');
});

// Handle "Calculate New" button
document.getElementById('calculate-new').addEventListener('click', function() {
    // Destroy chart if it exists
    if (benefitChart) {
        benefitChart.destroy();
        benefitChart = null;
    }

    // Hide overlay and show form
    document.getElementById('results-overlay').classList.add('hidden');
    document.getElementById('evaluator-form').classList.remove('hidden');

    // Clear canvas context to prevent overlap (optional, for safety)
    const canvas = document.getElementById('benefitChart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});