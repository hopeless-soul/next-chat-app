import ConversationView from '@/components/chat/ConversationView';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  return <ConversationView conversationId={id} />;
}
