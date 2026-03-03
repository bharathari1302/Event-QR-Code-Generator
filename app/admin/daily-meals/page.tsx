import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Manage Daily Meals',
};

export default function Page() {
    return <ClientPage />;
}
