import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Entry Scanner',
};

export default function Page() {
    return <ClientPage />;
}
