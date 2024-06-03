var utils = {
    formatRelativeTime: function(date) {
        const now = new Date();
        const diff = now - date;

        // Convert milliseconds to seconds
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) {
            return `${seconds}s`;
        }

        // Convert to minutes
        const minutes = Math.floor(seconds / 60);

        if (minutes < 60) {
            // If minutes are less than 60 and it's less than a minute, show exact seconds
            if (seconds < 120) {
                return `${seconds}s`;
            }
            return `${minutes}m`;
        }

        // Convert to hours
        const hours = Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours}h`;
        }

        // Convert to days
        const days = Math.floor(hours / 24);

        if (days < 7) {
            return `${days}d`;
        }

        // Convert to weeks
        const weeks = Math.floor(days / 7);

        return `${weeks}w`;
    }
};

module.exports = utils;