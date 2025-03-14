import { useState } from 'react';
import { useRouter } from 'next/router';

export default function UploadEmails() {
    const router = useRouter();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFile(file);
        setError(null);
        setResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    let emails = [];
                    const rows = event.target.result.split('\n');
                    
                    // Skip header row and process each line
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i].trim();
                        if (row) {
                            const [email, name] = row.split(',').map(field => field.trim());
                            if (email) {
                                emails.push({ email, name: name || null, active: true });
                            }
                        }
                    }

                    const response = await fetch('/api/uploadEmails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(emails),
                    });

                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to upload emails');
                    }

                    setResult(data);
                } catch (error) {
                    setError(error.message);
                }
                setLoading(false);
            };

            reader.readAsText(file);
        } catch (error) {
            setError('Error reading file');
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Upload Email List</h1>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload CSV File
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                                File should be a CSV with headers: email,name
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-black file:text-white
                                    hover:file:bg-gray-800
                                    cursor-pointer"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !file}
                            className={`w-full bg-black text-white py-2 px-4 rounded-md
                                ${loading || !file ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}
                                transition-colors`}
                        >
                            {loading ? 'Uploading...' : 'Upload'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {result && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                            <h3 className="font-medium text-green-800">Upload Results:</h3>
                            <p className="mt-1 text-green-700">Successfully added: {result.inserted} emails</p>
                            {result.errors.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-red-700">Errors: {result.errors.length}</p>
                                    <ul className="mt-1 list-disc list-inside text-sm text-red-600">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx}>
                                                {err.email}: {err.error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h2 className="text-lg font-medium mb-2">Instructions</h2>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                        <li>Prepare a CSV file with headers: email,name</li>
                        <li>The email column is required, name is optional</li>
                        <li>Each email will be set as active by default</li>
                        <li>Duplicate emails will update existing records</li>
                        <li>Example format:
                            <pre className="mt-2 bg-gray-100 p-2 rounded">
                                email,name{'\n'}
                                john@example.com,John Doe{'\n'}
                                jane@example.com,Jane Smith
                            </pre>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
} 