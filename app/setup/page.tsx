import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Initial Setup',
};

export default function Page() {
    return <ClientPage />;
}
