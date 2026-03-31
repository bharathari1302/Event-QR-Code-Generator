import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Global Students Directory | Q-Swift',
    description: 'Manage the global student data.',
};

export default function StudentsPage() {
    return <ClientPage />;
}
