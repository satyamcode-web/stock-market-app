
const Stocks = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "PYPL",
    "TSLA", "JPM", "NVDA", "NFLX", "DIS"
];

const STOCKS_API =
    "https://stock-market-api-k9vl.onrender.com/api/stocksdata";

const STATS_API =
    "https://stock-market-api-k9vl.onrender.com/api/stocksstatsdata";

const PROFILE_API =
    "https://stock-market-api-k9vl.onrender.com/api/profiledata";

let stocksData = {};
let stockStats = {};
let profileData = {};
let selectedStock = "AAPL";
let selectedRange = "1mo";
let stockChart = null;

// API se data load karna
async function fetchAPI(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("API data load nahi hua: " + url);
    }

    return response.json();
}

// Sabhi APIs load karna
async function init() {
    try {
        const [pricesResponse, statsResponse, profileResponse] =
            await Promise.all([
                fetchAPI(STOCKS_API),
                fetchAPI(STATS_API),
                fetchAPI(PROFILE_API)
            ]);

        stocksData = pricesResponse.stocksData[0];
        stockStats = statsResponse.stocksStatsData[0];

        profileData = Array.isArray(profileResponse.profileData)
            ? profileResponse.profileData[0]
            : profileResponse.profileData;

        renderStockList();
        renderStockDetails();
        renderChart();

    } catch (error) {
        console.error("App Error:", error);

        const message = document.getElementById("error-message");
        if (message) {
            message.textContent =
                "Data load nahi hua. Page refresh karke dobara try karo.";
        }
    }
}

// Stock list render karna
function renderStockList() {
    const stockList = document.getElementById("stock-list");
    if (!stockList) return;

    stockList.innerHTML = "";

    Stocks.forEach(function (symbol) {
        const stats = stockStats[symbol];
        const item = document.createElement("div");

        item.className = "stock-item";
        if (symbol === selectedStock) {
            item.classList.add("active");
        }

        const heading = document.createElement("h3");
        heading.textContent = symbol;
        item.appendChild(heading);

        if (stats) {
            const bookValue = document.createElement("p");
            bookValue.textContent =
                "Book Value: " + stats.bookValue;
            item.appendChild(bookValue);

            const profit = document.createElement("p");
            profit.textContent =
                "Profit: " + (stats.profit * 100).toFixed(2) + "%";
            profit.style.color =
                stats.profit > 0 ? "#22c55e" :
                stats.profit < 0 ? "#ef4444" : "#94a3b8";
            item.appendChild(profit);
        }

        item.addEventListener("click", function () {
            selectedStock = symbol;
            renderStockList();
            renderStockDetails();
            renderChart();
        });

        stockList.appendChild(item);
    });
}

// Stock details render karna
function renderStockDetails() {
    const details = document.getElementById("stock-details");
    if (!details) return;

    const stats = stockStats[selectedStock];
    const profile = profileData?.[selectedStock];

    details.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = selectedStock;
    details.appendChild(heading);

    if (stats) {
        const bookValue = document.createElement("p");
        bookValue.textContent = "Book Value: " + stats.bookValue;
        details.appendChild(bookValue);

        const profit = document.createElement("p");
        profit.textContent =
            "Profit: " + (stats.profit * 100).toFixed(2) + "%";

        profit.style.color =
            stats.profit > 0 ? "#22c55e" :
            stats.profit < 0 ? "#ef4444" : "#94a3b8";

        details.appendChild(profit);
    }

    if (profile) {
        const summary = document.createElement("p");

        const description =
            profile.summary ||
            profile.description ||
            profile.longBusinessSummary;

        summary.textContent =
            typeof description === "string"
                ? description
                : "Profile summary available nahi hai.";

        details.appendChild(summary);
    }
}

// Time range buttons: 1month, 3month, 1year, 5year
function changeRange(range) {
    const rangeMap = {
        "1month": "1mo",
        "3month": "3mo",
        "1year": "1y",
        "5year": "5y"
    };

    selectedRange = rangeMap[range] || range;
    renderChart();
}

// Chart render karna
function renderChart() {
    const canvas = document.getElementById("stock-chart");
    if (!canvas || typeof Chart === "undefined") {
        console.error("Chart canvas ya Chart.js nahi mila.");
        return;
    }

    const stock = stocksData[selectedStock];
    const rangeData = stock?.[selectedRange];

    if (!rangeData ||
        !Array.isArray(rangeData.value) ||
        !Array.isArray(rangeData.timeStamp)) {
        console.error("Stock chart data nahi mila:", selectedStock);
        return;
    }

    const labels = rangeData.timeStamp.map(function (timestamp) {
        return new Date(timestamp * 1000).toLocaleDateString();
    });

    const values = rangeData.value;

    if (stockChart) {
        stockChart.destroy();
    }

    stockChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: selectedStock + " Stock Price",
                data: values,
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                borderWidth: 2,
                pointRadius: 2,
                fill: true,
                tension: 0.25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return "Price: $" +
                                Number(context.parsed.y).toFixed(2);
                        }
                    }
                },
                legend: {
                    labels: {
                        color: "#f1f5f9"
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#94a3b8",
                        maxTicksLimit: 7
                    },
                    title: {
                        display: true,
                        text: "Date",
                        color: "#f1f5f9"
                    },
                    grid: {
                        color: "rgba(148, 163, 184, 0.1)"
                    }
                },
                y: {
                    ticks: {
                        color: "#94a3b8"
                    },
                    title: {
                        display: true,
                        text: "Stock Price ($)",
                        color: "#f1f5f9"
                    },
                    grid: {
                        color: "rgba(148, 163, 184, 0.1)"
                    }
                }
            }
        }
    });

    renderPeakLow(rangeData);
}

// Selected range ka highest aur lowest price
function renderPeakLow(rangeData) {
    const peakElement = document.getElementById("peak-price");
    const lowElement = document.getElementById("low-price");

    const values = rangeData.value;
    if (!values.length) return;

    const peak = Math.max(...values);
    const low = Math.min(...values);

    if (peakElement) {
        peakElement.textContent = "$" + peak.toFixed(2);
    }

    if (lowElement) {
        lowElement.textContent = "$" + low.toFixed(2);
    }
}

// App start
init();