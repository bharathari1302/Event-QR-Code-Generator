import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Manage Event Options',
};

export default function Page() {
    return <ClientPage />;
}
