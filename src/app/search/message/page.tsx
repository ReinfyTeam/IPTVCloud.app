import { redirect } from 'next/navigation';

export default function SearchMessageRedirect() {
  redirect('/search/messages');
}
