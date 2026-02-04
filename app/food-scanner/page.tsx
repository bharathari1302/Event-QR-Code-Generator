import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Food Scanner',
};

export default function Page() {
    return <ClientPage />;
}
