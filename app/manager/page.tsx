import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Manager Dashboard',
};

export default function Page() {
    return <ClientPage />;
}
