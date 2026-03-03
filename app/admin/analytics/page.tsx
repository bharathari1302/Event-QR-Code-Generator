import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Analytics & Statistics',
};

export default function Page() {
    return <ClientPage />;
}
