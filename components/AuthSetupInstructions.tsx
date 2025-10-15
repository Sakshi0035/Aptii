import React, { useState } from 'react';
import { SUPABASE_URL } from '../constants';
import { WarningIcon, ClipboardIcon, CheckIcon } from './Icons';

type AuthType = 'oauth' | 'email';

interface Props {
    type: AuthType;
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-xs text-left overflow-x-auto">
        <code>{children}</code>
    </pre>
);

const AuthSetupInstructions: React.FC<Props> = ({ type }) => {
    const callbackUrl = `${new URL(SUPABASE_URL).origin}/auth/v1/callback`;
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(callbackUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const GoogleInstructions = () => (
        <>
            <h4 className="font-bold mt-4">1. Enable Google Provider in Supabase</h4>
            <p className="text-sm mt-1">
                Go to your Supabase Dashboard &rarr; Authentication &rarr; Providers, and enable Google.
            </p>

            <h4 className="font-bold mt-4">2. Configure Google Cloud Console</h4>
            <p className="text-sm mt-1">
                You will need a <strong>Client ID</strong> and <strong>Client Secret</strong> from the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-fire-orange-start underline">Google Cloud Console</a>. Create an "OAuth 2.0 Client ID" for a "Web application".
            </p>

            <h4 className="font-bold mt-4">3. Add the Authorized Redirect URI</h4>
            <p className="text-sm mt-1">
                This is the most important step. In your Google Cloud credential settings, you <strong>must</strong> add the following URL to your list of "Authorized redirect URIs":
            </p>
            <div className="relative mt-2">
                <CodeBlock>{callbackUrl}</CodeBlock>
                <button onClick={copyToClipboard} className="absolute top-2 right-2 p-1.5 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                    {copied ? <CheckIcon size={14} className="text-green-500"/> : <ClipboardIcon size={14}/>}
                </button>
            </div>
            <p className="text-xs mt-1">After adding the URI and saving your Google credentials in Supabase, Google login will work.</p>
        </>
    );

    const EmailInstructions = () => (
         <>
            <h4 className="font-bold mt-4">1. Enable Email Provider</h4>
            <p className="text-sm mt-1">
                Go to your Supabase Dashboard &rarr; Authentication &rarr; Providers, and ensure the Email provider is enabled.
            </p>

            <h4 className="font-bold mt-4">2. Check Email Confirmation Settings</h4>
            <p className="text-sm mt-1">
                For sign-ups to work, "Confirm email" must be enabled in Supabase &rarr; Authentication &rarr; Settings. For production apps, you'll need to configure a custom SMTP server under Settings &rarr; Auth &rarr; SMTP Settings to avoid rate limits with the default email provider.
            </p>
        </>
    )


    return (
        <div className="text-center p-4 my-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg animate-fade-in">
            <div className="flex justify-center items-center mb-2">
                <WarningIcon size={24} className="mr-2" />
                <h3 className="font-bold text-lg">Auth Configuration Needed</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 max-w-md mx-auto">
                Your authentication providers are not fully configured in your Supabase project. Follow these steps to fix it.
            </p>
            <details className="mt-4 w-full text-left">
                <summary className="cursor-pointer font-semibold text-sm text-center">Show Setup Instructions</summary>
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-md">
                   {type === 'oauth' && <GoogleInstructions />}
                   {type === 'email' && <EmailInstructions />}
                </div>
            </details>
        </div>
    );
};

export default AuthSetupInstructions;
