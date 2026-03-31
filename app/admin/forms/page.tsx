import { Metadata } from 'next';
import ClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'Directory Forms | Q-Swift',
    description: 'Configure directory forms and share links.',
};

export default function FormsPage() {
    return <ClientPage />;
}
