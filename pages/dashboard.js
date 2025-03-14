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
    const [tokenHealth, setTokenHealth] = useState({
        status: 'healthy',
        lastChecked: new Date().toLocaleString()
    });
    const [testEmail, setTestEmail] = useState('');
    const [testEmailStatus, setTestEmailStatus] = useState('');

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

    const sendTestEmail = async () => {
        if (!testEmail) {
            setTestEmailStatus('Please enter an email address');
            return;
        }
        try {
            setTestEmailStatus('Sending...');
            const response = await fetch('/api/sendTestEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: testEmail }),
            });
            const data = await response.json();
            if (response.ok) {
                setTestEmailStatus('Test email sent successfully!');
                setTestEmail('');
            } else {
                setTestEmailStatus(`Error: ${data.error}`);
            }
        } catch (error) {
            setTestEmailStatus('Error sending test email');
            console.error('Error:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Email Queue Dashboard</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.location.href = '/upload'}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Upload Emails
                    </button>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold mb-2">Pending</h2>
                    <p className="text-4xl font-bold text-gray-900">{stats.pending || 0}</p>
                    <button
                        onClick={sendPendingEmails}
                        className="mt-4 bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                    >
                        Process Pending Emails
                    </button>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold mb-2">Sent</h2>
                    <p className="text-4xl font-bold text-gray-900">{stats.sent || 0}</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h2 className="text-xl font-semibold mb-2">Failed</h2>
                    <p className="text-4xl font-bold text-gray-900">{stats.failed || 0}</p>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Test Email</h2>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                Send test email to:
                            </label>
                            <input
                                type="email"
                                id="testEmail"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="Enter email address"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <button
                            onClick={sendTestEmail}
                            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Send Test
                        </button>
                    </div>
                    {testEmailStatus && (
                        <p className={`mt-2 text-sm ${testEmailStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                            {testEmailStatus}
                        </p>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Email Tracking Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-xl font-semibold mb-2">
                            Open Rate 
                            <span className="text-sm font-normal text-gray-600 ml-2">
                                {timePeriod === 'hour' ? '(Last Hour)' :
                                 timePeriod === 'day' ? '(Last 24h)' : 
                                 timePeriod === 'week' ? '(Last 7d)' : 
                                 '(All Time)'}
                            </span>
                        </h3>
                        <p className="text-4xl font-bold text-gray-900">
                            {trackingStats.totalSent ? 
                                `${Math.round((trackingStats.totalOpened / trackingStats.totalSent) * 100)}%` 
                                : '0%'}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            {trackingStats.totalOpened} opened of {trackingStats.totalSent} sent
                        </p>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h3 className="text-xl font-semibold mb-2">Recent Opens</h3>
                        <div className="space-y-2">
                            {trackingStats.recentOpens?.map((open, index) => (
                                <div key={index} className="text-sm text-gray-700">
                                    {open.email} - {new Date(open.opened_at).toLocaleString()}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Email Click Activity</h2>
                <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 text-gray-700">Email</th>
                                <th className="text-left py-3 text-gray-700">Link</th>
                                <th className="text-left py-3 text-gray-700">Clicked At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clickStats.map((click, index) => (
                                <tr key={index} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-3">{click.to_email}</td>
                                    <td className="py-3">
                                        <a href={click.link_url} 
                                           className="text-gray-900 hover:text-gray-600"
                                           target="_blank"
                                           rel="noopener noreferrer">
                                            {click.link_url}
                                        </a>
                                    </td>
                                    <td className="py-3 text-gray-700">
                                        {new Date(click.clicked_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center text-sm border-t border-gray-200 pt-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Token Status:</span>
                        {tokenHealth.status === 'error' ? (
                            <>
                                <span className="text-gray-900">✖</span>
                                <span className="text-gray-900 font-medium">Error</span>
                                <button
                                    onClick={() => window.open('https://developers.google.com/oauthplayground', '_blank')}
                                    className="ml-2 bg-black hover:bg-gray-800 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    Refresh Token
                                </button>
                            </>
                        ) : (
                            <>
                                <span className="text-gray-900">✓</span>
                                <span className="text-gray-900 font-medium">Healthy</span>
                            </>
                        )}
                    </div>
                    <span className="text-gray-600">
                        Last checked: {tokenHealth.lastChecked}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    Last updated: {lastUpdated.toLocaleString()}
                    <button
                        onClick={updateAllStats}
                        className="ml-4 text-gray-900 hover:text-gray-600 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
} 