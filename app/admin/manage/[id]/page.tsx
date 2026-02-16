import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Event Details',
};

export default function Page() {
    return <ClientPage />;
}
