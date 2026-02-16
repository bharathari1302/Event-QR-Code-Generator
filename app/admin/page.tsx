import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Upload Participants',
};

export default function Page() {
    return <ClientPage />;
}
