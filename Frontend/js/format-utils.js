(function () {
    const nprFormatter = new Intl.NumberFormat('ne-NP', {
        maximumFractionDigits: 0,
    });

    function formatNpr(amount = 0) {
        const value = Number(amount) || 0;
        return `रु ${nprFormatter.format(value)}`;
    }

    window.formatNpr = window.formatNpr || formatNpr;
    window.formatCurrency = window.formatCurrency || formatNpr;
    window.formatPrice = window.formatPrice || formatNpr;
})();