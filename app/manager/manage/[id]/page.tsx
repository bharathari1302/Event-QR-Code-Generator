import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Manage Event (Manager)',
};

export default function Page() {
    return <ClientPage />;
}
