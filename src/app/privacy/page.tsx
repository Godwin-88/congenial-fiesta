import JsonLd from '@/components/seo/JsonLd'
import { organizationJsonLd } from '@/lib/seo/jsonld'

export const metadata = {
  title: 'Privacy Policy | FweezyTech',
  description:
    'How FweezyTech collects, uses, protects and processes personal data in line with the Kenya Data Protection Act, 2019.',
  openGraph: {
    images: [{ url: '/api/og/default?title=Privacy+Policy', width: 1200, height: 630 }],
  },
}

/**
 * Controller details — update before going live.
 *  - Set CONTACT_EMAIL to the mailbox your team actually reads.
 *  - Add your ODPC registration / notification reference once obtained.
 */
const CONTACT_EMAIL = 'privacy@fweezytech.com'
const CONTROLLER_NAME = 'FweezyTech'
const EFFECTIVE_DATE = '6 September 2026'

const NAV_SECTIONS = [
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'what-we-collect', label: 'What we collect' },
  { id: 'why-we-use', label: 'Why we use it' },
  { id: 'legal-basis', label: 'Legal basis' },
  { id: 'cookies', label: 'Cookies & storage' },
  { id: 'third-parties', label: 'Third parties' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'retention', label: 'Retention' },
  { id: 'security', label: 'Security' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'breach', label: 'Breach policy' },
  { id: 'children', label: 'Children' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'changes', label: 'Changes' },
] as const

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="scroll-mt-28 font-heading text-xl font-bold text-foreground">
      {title}
    </h2>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-relaxed text-foreground/90">{children}</p>
}

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd()]} />

      {/* HERO */}
      <header className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Legal · FweezyTech</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          This policy explains what personal data FweezyTech collects, why we collect it, how
          we protect it, and the rights you have over it. It is drafted to align with the{' '}
          <strong className="text-foreground">Kenya Data Protection Act, 2019</strong> and is
          structured to be easy to read on any device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
            Controller: {CONTROLLER_NAME}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Effective {EFFECTIVE_DATE}
          </span>
        </div>
      </header>

      {/* STICKY TOC */}
      <nav
        aria-label="Privacy policy sections"
        className="mx-auto sticky top-14 z-30 max-w-5xl overflow-x-auto rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur"
      >
        <div className="flex flex-wrap gap-1.5">
          {NAV_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="whitespace-nowrap rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* BODY */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <section>
            <SectionHeading id="who-we-are" title="Who we are" />
            <Prose>
              {CONTROLLER_NAME} ("FweezyTech", "we") operates fweezytech.com — a platform
              publishing device reviews, comparisons, buying guides, and related tech content
              across the web and our social channels. This policy applies to our websites and
              the services we run, including the newsletter, "notify me" alerts, coming-soon
              lists, user accounts, and affiliate shopping links.
            </Prose>
          </section>

          <section>
            <SectionHeading id="what-we-collect" title="What we collect" />
            <Prose>
              We only collect what is needed to make the site work and to deliver the content
              and services you ask for. The personal data we may process includes:
            </Prose>
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li>
                <strong>Email address</strong> — when you subscribe to the newsletter, request a
                "notify me" or coming-soon alert, create an account, or submit a press /
                sponsorship inquiry.
              </li>
              <li>
                <strong>Account details</strong> — if you create a user account: display name,
                email, and (where email/password sign-in is used) a securely hashed credential
                managed by our authentication provider.
              </li>
              <li>
                <strong>Inquiry details</strong> — name, organisation and message content when
                you use our press or sponsorship contact forms.
              </li>
              <li>
                <strong>Usage information</strong> — the pages you view, which affiliate /
                retailer links you click, and your search queries on this site. This is recorded
                at an aggregate level and is used only to understand what content is useful.
              </li>
              <li>
                <strong>Technical data</strong> — IP address (used transiently for rate-limiting
                and fraud prevention), browser type and device type, and basic referrer data.
              </li>
              <li>
                <strong>Preferences</strong> — theme preference and comparison-tray contents,
                stored locally in your browser.
              </li>
            </ul>
          </section>

          <section>
            <SectionHeading id="why-we-use" title="Why we use it" />
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li><strong>To send you what you asked for</strong> — review notifications, availability alerts, and the newsletter.</li>
              <li><strong>To answer your inquiries</strong> — press, sponsorships, and other messages.</li>
              <li><strong>To operate your account</strong> — keep you signed in, manage your profile, and secure the dashboard if you are an authorised administrator.</li>
              <li><strong>To improve our content</strong> — understand which reviews, comparisons and guides are popular so we can publish more of what our readers value.</li>
              <li><strong>To measure affiliate links</strong> — record that a reader left through a retailer link so partner programmes can attribute referrals.</li>
            </ul>
          </section>

          <section>
            <SectionHeading id="legal-basis" title="Our legal basis" />
            <Prose>
              Under the Kenya Data Protection Act, 2019 (sections 25–26), we process your data on
              the following bases:
            </Prose>
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li><strong>Consent</strong> — for newsletter, notify-me and coming-soon alerts. You give this freely and can withdraw it at any time (see “Marketing & how to opt out”).</li>
              <li><strong>Contract</strong> — where you open an account, or where we provide services to you or your organisation (e.g., sponsorships).</li>
              <li><strong>Legal obligation</strong> — where Kenyan law requires us to keep records (for example, tax or company records).</li>
              <li><strong>Legitimate interests</strong> — analytics, security, abuse prevention, and the operation of affiliate links, always balanced against your rights and interests.</li>
            </ul>
            <Prose>
              Where we rely on legitimate interests, you may object to the processing (section
              31 of the Act) — see “Your rights” below.
            </Prose>
          </section>

          <section>
            <SectionHeading id="cookies" title="Cookies, local storage & analytics" />
            <Prose>
              We use a small number of first-party cookies and browser storage to operate the
              site:
            </Prose>
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li><strong>Authentication cookies</strong> — keep you signed in to your account.</li>
              <li><strong>Theme & comparison tray</strong> — stored in your browser (localStorage); this never leaves your device.</li>
              <li><strong>Analytics beacon</strong> — a privacy-respecting, cookie-light beacon that records which pages are viewed and which device links are clicked. It does not use cross-site trackers and does not attempt to re-identify you.</li>
            </ul>
            <Prose>
              We do not use third-party advertising cookies, tracking pixels, or fingerprinting
              scripts. You can clear cookies and site data from your browser at any time without
              losing the ability to use the site.
            </Prose>
          </section>

          <section>
            <SectionHeading id="third-parties" title="Third parties we share data with" />
            <Prose>
              We do not sell your personal data. We share data only with processors that help us
              operate the platform, under contract, and only to the extent necessary:
            </Prose>
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li><strong>Supabase</strong> — database hosting, authentication, and storage for device images & file uploads.</li>
              <li><strong>Upstash</strong> — Redis cache, vector search, analytics, and the QStash task queue.</li>
              <li><strong>Cloudflare</strong> — edge network, image delivery and (optionally) object storage.</li>
              <li><strong>Vercel</strong> — application hosting and deployment.</li>
              <li><strong>Resend / SMTP</strong> — delivery of the emails you requested (newsletter, availability, account).</li>
              <li><strong>Groq</strong> — the AI assistant and content-analysis features process the text you submit to them. See the AI section below.</li>
            </ul>
            <Prose>
              Where these processors are located outside Kenya, we rely on appropriate safeguards
              for international data transfers as permitted by the Act (sections 48–49).
            </Prose>
          </section>

          <section>
            <SectionHeading id="transfers" title="International data transfers" />
            <Prose>
              Some of the processors listed above are located outside Kenya. Where personal data
              is transferred across borders, we ensure the transfer complies with the Kenya Data
              Protection Act, 2019, including (where required) relying on appropriate safeguards
              or derogations recognised under the Act. We will give you further details on
              request.
            </Prose>
          </section>

          <section>
            <SectionHeading id="retention" title="How long we keep your data" />
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li><strong>Emails (newsletter/alerts)</strong> — kept until you unsubscribe or ask us to delete them, or the feature they support ends.</li>
              <li><strong>Accounts</strong> — kept while your account is active; deletion requests are honoured promptly.</li>
              <li><strong>Inquiries</strong> — kept only as long as needed to respond and, where relevant, to maintain the relationship you asked for.</li>
              <li><strong>Analytics</strong> — aggregated usage statistics are kept in a form that does not identify individuals.</li>
              <li><strong>Technical/security logs</strong> — retained only as long as needed for security and abuse-prevention.</li>
            </ul>
            <Prose>
              When we no longer need personal data for the purpose it was collected, we delete or
              anonymise it in line with the Act’s data-minimisation and storage-limitation
              principles.
            </Prose>
          </section>

          <section>
            <SectionHeading id="security" title="How we protect your data" />
            <Prose>
              We apply organisational and technical measures appropriate to the risk, including
              encryption in transit (TLS), encryption of sensitive credentials at rest,
              role-based access controls (only named staff can reach personal data), rate
              limiting on public forms, and security monitoring of key infrastructure. We review
              these measures regularly.
            </Prose>
          </section>

          <section>
            <SectionHeading id="your-rights" title="Your rights under the Act" />
            <Prose>
              The Kenya Data Protection Act, 2019 gives you the right to:
            </Prose>
            <ul className="mt-3 list-inside space-y-2 text-foreground/90">
              <li><strong>Access</strong> (s.27) — request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> (s.28) — ask us to correct inaccurate or incomplete data.</li>
              <li><strong>Deletion</strong> (s.29) — ask us to delete personal data we no longer need.</li>
              <li><strong>Data portability</strong> (s.30) — ask us to provide your data in a structured, machine-readable format.</li>
              <li><strong>Objection / restriction</strong> (s.31) — object to processing based on legitimate interests, or restrict how we process your data.</li>
              <li><strong>Withdraw consent</strong> — stop marketing and notification emails at any time.</li>
            </ul>
            <Prose>
              To exercise any of these rights, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              with your request and the email address you used. We will respond within the time
              limits set by the Act and may ask you to verify your identity first. We will not
              charge a fee for routine requests.
            </Prose>
          </section>

          <section>
            <SectionHeading id="breach" title="Data breach notification" />
            <Prose>
              If a personal data breach occurs that could result in a risk to your rights and
              freedoms, we will notify the Office of the Data Protection Commissioner (ODPC) and,
              where appropriate, affected individuals without undue delay, as required by the
              Act (s.24(2)). We maintain an internal incident-response process and review
              breaches to reduce the likelihood of recurrence.
            </Prose>
          </section>

          <section>
            <SectionHeading id="children" title="Children’s data" />
            <Prose>
              Our content is intended for general audiences and we do not knowingly collect
              personal data from children. Our public forms ask for an email address from a
              person who can consent to receiving updates. If we become aware we have collected
              data from a child without the consent of a holder of parental responsibility, we
              will delete it promptly.
            </Prose>
          </section>

          <section>
            <SectionHeading id="marketing" title="Marketing & how to opt out" />
            <Prose>
              We only send the emails you asked for: review notifications, availability alerts
              and the newsletter. Every marketing email includes an unsubscribe option, and you
              can also email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              at any time to be removed from all lists. We do not sell or rent our email lists.
            </Prose>
          </section>

          <section>
            <SectionHeading id="changes" title="Changes to this policy" />
            <Prose>
              We review this policy regularly and will post any material changes on this page,
              updating the effective date at the top. Where a change would require new consent
              (for example, a new use of your data), we will ask for your consent before applying
              it.
            </Prose>
          </section>
        </div>
      </div>
    </>
  )
}
