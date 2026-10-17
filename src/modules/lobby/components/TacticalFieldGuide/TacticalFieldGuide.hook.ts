import { useState } from 'react';

/** The guide starts collapsed so the lobby and ad slot fit on a phone screen; desktop ignores this state. */
export function useTacticalFieldGuide() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => setIsExpanded((wasExpanded) => !wasExpanded);

  return { isExpanded, toggleExpanded };
}
