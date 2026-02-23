import { Metadata } from 'next';
import EventsClientPage from './ClientPage';

export const metadata: Metadata = {
    title: 'My Events | Manager',
};

export default function Page() {
    return <EventsClientPage />;
}
