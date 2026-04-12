import { montserrat, openSans } from '@/lib/fonts';

export const metadata = {
  title: 'Peak360 Longevity Program',
  description: 'Comprehensive longevity assessments for optimal health and performance.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${montserrat.variable} ${openSans.variable} font-body`}>
      {children}
    </div>
  );
}
