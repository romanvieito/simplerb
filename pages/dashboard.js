import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [stats, setStats] = useState({
        pending: 0,
        sent: 0,
        failed: 0
    });
    const [trackingStats, setTrackingStats] = useState({
        totalSent: 0,
        totalOpened: 0,
        recentOpens: []
    });
    const [timePeriod, setTimePeriod] = useState('day');
    const [loading, setLoading] = useState(true);
    const [clickStats, setClickStats] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        updateAllStats();
        // Update every hour (3600000 ms)
        const interval = setInterval(updateAllStats, 3600000);
        return () => clearInterval(interval);
    }, [timePeriod]);

    const updateAllStats = async () => {
        await Promise.all([
            fetchStats(),
            fetchTrackingStats(),
            fetchClickStats()
        ]);
        setLastUpdated(new Date());
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`/api/emailStats?period=${timePeriod}`);
            const data = await response.json();
            if (Array.isArray(data)) {  // Make sure data is an array before using forEach
                const statsMap = {};
                data.forEach(item => {
                    statsMap[item.status] = parseInt(item.count);
                });
                setStats(statsMap);
            } else {
                console.error('Expected array but got:', data);
                setStats({});  // Set empty object as fallback
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStats({});  // Set empty object on error
            setLoading(false);
        }
    };

    const fetchTrackingStats = async () => {
        try {
            const response = await fetch(`/api/emailTrackingStats?period=${timePeriod}`);
            const data = await response.json();
            setTrackingStats(data);
        } catch (error) {
            console.error('Error fetching tracking stats:', error);
        }
    };

    const fetchClickStats = async () => {
        try {
            const response = await fetch(`/api/emailClickStats?period=${timePeriod}`);
            const data = await response.json();
            if (Array.isArray(data)) {  // Make sure data is an array
                setClickStats(data);
            } else {
                console.error('Expected array but got:', data);
                setClickStats([]);  // Set empty array as fallback
            }
        } catch (error) {
            console.error('Error fetching click stats:', error);
            setClickStats([]);  // Set empty array on error
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Email Queue Dashboard</h1>
                <select 
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    className="border rounded-md px-3 py-1"
                >
                    <option value="day">Last 24 Hours</option>
                    <option value="hour">Last Hour</option>
                    <option value="week">Last Week</option>
                    <option value="all">All Time</option>
                </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-100 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Pending</h2>
                    <p className="text-4xl font-bold text-blue-600">{stats.pending || 0}</p>
                    <button
                        onClick={sendPendingEmails}
                        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                        Process Pending Emails
                    </button>
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

            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Email Tracking Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-purple-100 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2">
                            Open Rate 
                            <span className="text-sm font-normal text-gray-600 ml-2">
                                {timePeriod === 'hour' ? '(Last Hour)' :
                                 timePeriod === 'day' ? '(Last 24h)' : 
                                 timePeriod === 'week' ? '(Last 7d)' : 
                                 '(All Time)'}
                            </span>
                        </h3>
                        <p className="text-4xl font-bold text-purple-600">
                            {trackingStats.totalSent ? 
                                `${Math.round((trackingStats.totalOpened / trackingStats.totalSent) * 100)}%` 
                                : '0%'}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            {trackingStats.totalOpened} opened of {trackingStats.totalSent} sent
                        </p>
                    </div>
                    
                    <div className="bg-indigo-100 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2">Recent Opens</h3>
                        <div className="space-y-2">
                            {trackingStats.recentOpens?.map((open, index) => (
                                <div key={index} className="text-sm">
                                    {open.email} - {new Date(open.opened_at).toLocaleString()}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Email Click Activity</h2>
                <div className="bg-white shadow rounded-lg p-6">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="text-left">Email</th>
                                <th className="text-left">Link</th>
                                <th className="text-left">Clicked At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clickStats.map((click, index) => (
                                <tr key={index} className="border-t">
                                    <td className="py-2">{click.to_email}</td>
                                    <td className="py-2">
                                        <a href={click.link_url} 
                                           className="text-blue-500 hover:underline"
                                           target="_blank"
                                           rel="noopener noreferrer">
                                            {click.link_url}
                                        </a>
                                    </td>
                                    <td className="py-2">
                                        {new Date(click.clicked_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-end items-center text-sm text-gray-600 border-t pt-4">
                Last updated: {lastUpdated.toLocaleString()}
                <button
                    onClick={updateAllStats}
                    className="ml-4 text-blue-500 hover:text-blue-700"
                >
                    Refresh
                </button>
            </div>
        </div>
    );
} 