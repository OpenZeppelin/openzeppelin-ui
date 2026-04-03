import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';

export function FaqSection() {
  const faqs = [
    { q: 'What networks are supported?', a: 'Ethereum, Polygon, Arbitrum, and more.' },
    { q: 'How do I deploy?', a: 'Use the deploy button after configuring your token.' },
    { q: 'Is it audited?', a: 'All contracts are audited by OpenZeppelin.' },
  ];

  return (
    <Accordion.Root type="single" collapsible>
      {faqs.map((faq, i) => (
        <Accordion.Item key={i} value={`faq-${i}`} className="border-b">
          <Accordion.Trigger className="py-3 font-medium w-full text-left">
            {faq.q}
          </Accordion.Trigger>
          <Accordion.Content className="pb-3 text-gray-600">
            {faq.a}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
