import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Manage Events',
};

export default function Page() {
    return <ClientPage />;
}
