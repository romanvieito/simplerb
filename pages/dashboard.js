import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [stats, setStats] = useState({
        pending: 0,
        sent: 0,
        failed: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/emailStats');
            const data = await response.json();
            const statsMap = {};
            data.forEach(item => {
                statsMap[item.status] = parseInt(item.count);
            });
            setStats(statsMap);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const sendPendingEmails = async () => {
        try {
            const response = await fetch('/api/sendEmail', {
                method: 'POST'
            });
            const data = await response.json();
            fetchStats(); // Refresh stats after sending
        } catch (error) {
            console.error('Error sending emails:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Email Queue Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-100 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Pending</h2>
                    <p className="text-4xl font-bold text-blue-600">{stats.pending || 0}</p>
                </div>
                <div className="bg-green-100 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Sent</h2>
                    <p className="text-4xl font-bold text-green-600">{stats.sent || 0}</p>
                </div>
                <div className="bg-red-100 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Failed</h2>
                    <p className="text-4xl font-bold text-red-600">{stats.failed || 0}</p>
                </div>
            </div>

            <button
                onClick={sendPendingEmails}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Process Pending Emails
            </button>
        </div>
    );
} 