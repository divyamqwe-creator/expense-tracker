const app = angular.module('expenseTracker', []);

app.controller('MainController', ['$scope', '$timeout', function($scope, $timeout) {
    // Authentication State
    $scope.isLoggedIn = false;
    $scope.currentUser = null;
    $scope.authMode = 'login'; // 'login' or 'register'
    $scope.authData = { username: '', password: '' };
    $scope.authError = '';

    // Initial Auth Check
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        $scope.isLoggedIn = true;
        $scope.currentUser = JSON.parse(savedUser);
    }

    // Auth Methods
    $scope.toggleAuthMode = function() {
        $scope.authMode = $scope.authMode === 'login' ? 'register' : 'login';
        $scope.authError = '';
    };

    $scope.handleAuth = function() {
        $scope.authError = '';
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if ($scope.authMode === 'register') {
            if (users.find(u => u.username === $scope.authData.username)) {
                $scope.authError = 'Username already exists';
                return;
            }
            users.push({ ...$scope.authData });
            localStorage.setItem('users', JSON.stringify(users));
            $scope.authMode = 'login';
            $scope.authError = 'Registration successful! Please login.';
            $scope.authData = { username: '', password: '' };
        } else {
            const user = users.find(u => u.username === $scope.authData.username && u.password === $scope.authData.password);
            if (user) {
                $scope.isLoggedIn = true;
                $scope.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                loadUserData();
            } else {
                $scope.authError = 'Invalid username or password';
            }
        }
    };

    $scope.logout = function() {
        $scope.isLoggedIn = false;
        $scope.currentUser = null;
        localStorage.removeItem('currentUser');
        $scope.authData = { username: '', password: '' };
        $scope.transactions = [];
    };

    // Data Management
    $scope.transactions = [];
    $scope.balance = 0;
    $scope.totalIncome = 0;
    $scope.totalExpense = 0;
    $scope.searchQuery = "";

    $scope.newTransaction = {
        title: '',
        amount: null,
        type: 'Expense',
        category: 'Food',
        date: new Date()
    };

    const loadUserData = () => {
        if (!$scope.isLoggedIn) return;
        const saved = localStorage.getItem(`transactions_${$scope.currentUser.username}`);
        $scope.transactions = saved ? JSON.parse(saved) : [];
        
        // Restore Date objects
        $scope.transactions.forEach(t => {
            t.date = new Date(t.date);
        });

        $timeout(() => {
            updateCalculations();
            updateCharts();
        }, 100);
    };

    // Chart Variables
    let categoryChart = null;
    let cashFlowChart = null;

    // Helper: Update Totals & Balance
    const updateCalculations = () => {
        $scope.totalIncome = $scope.transactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        $scope.totalExpense = $scope.transactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        $scope.balance = $scope.totalIncome - $scope.totalExpense;
    };

    // Helper: Save to LocalStorage
    const saveToStorage = () => {
        if (!$scope.isLoggedIn) return;
        localStorage.setItem(`transactions_${$scope.currentUser.username}`, JSON.stringify($scope.transactions));
    };

    // Helper: Update Charts
    const updateCharts = () => {
        const catEl = document.getElementById('categoryChart');
        const flowEl = document.getElementById('cashFlowChart');
        
        if (!catEl || !flowEl) return;

        const categories = {};
        $scope.transactions.forEach(t => {
            if (t.type === 'Expense') {
                categories[t.category] = (categories[t.category] || 0) + (parseFloat(t.amount) || 0);
            }
        });

        const catLabels = Object.keys(categories);
        const catData = Object.values(categories);

        // Category Pie Chart
        const ctxCat = catEl.getContext('2d');
        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'],
                    borderWidth: 0
                }]
            },
        options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: 20
                },
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            color: '#94a3b8',
                            padding: 20,
                            font: { size: 12 }
                        } 
                    }
                }
            }
        });

        // Cash Flow Bar Chart
        const ctxFlow = flowEl.getContext('2d');
        if (cashFlowChart) cashFlowChart.destroy();
        cashFlowChart = new Chart(ctxFlow, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [$scope.totalIncome, $scope.totalExpense],
                    backgroundColor: ['#22c55e', '#ef4444'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 10,
                        left: 10,
                        right: 20
                    }
                },
                scales: {
                    y: { 
                        ticks: { color: '#94a3b8' }, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        beginAtZero: true
                    },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    };

    // Add Transaction
    $scope.addTransaction = function() {
        const transaction = {
            ...$scope.newTransaction,
            id: Date.now(),
            date: new Date($scope.newTransaction.date)
        };

        $scope.transactions.unshift(transaction); // Add to top
        updateCalculations();
        saveToStorage();
        updateCharts();

        // Reset Form
        $scope.newTransaction = {
            title: '',
            amount: null,
            type: 'Expense',
            category: 'Food',
            date: new Date()
        };
    };

    // Delete Transaction
    $scope.deleteTransaction = function(id) {
        $scope.transactions = $scope.transactions.filter(t => t.id !== id);
        updateCalculations();
        saveToStorage();
        updateCharts();
    };

    // Initialize
    if ($scope.isLoggedIn) {
        loadUserData();
    }

}]);
