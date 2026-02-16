import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Warden Dashboard',
};

export default function Page() {
    return <ClientPage />;
}
