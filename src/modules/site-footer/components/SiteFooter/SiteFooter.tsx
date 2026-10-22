import Link from 'next/link';
import { SITE_FOOTER_LINKS } from './SiteFooter.links';
import { styles } from './SiteFooter.styles';

/** Pure view: links to the site's public pages. Shown on login and lobby, never in a game. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <nav aria-label="Site pages">
        <ul className={styles.list}>
          {SITE_FOOTER_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={styles.link}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
