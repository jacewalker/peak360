import { View, Text } from '@react-pdf/renderer';
import type { ReportMarker } from '@/lib/pdf/types';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';
import { MarkerRow } from './MarkerRow';

interface MarkerTableProps {
  markers: ReportMarker[];
}

export function MarkerTable({ markers }: MarkerTableProps) {
  const categories = [...new Set(markers.map((m) => m.category))];

  return (
    <View break>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingBar} />
        <Text style={styles.sectionHeadingText}>Detailed Results</Text>
      </View>

      {categories.map((cat) => {
        const catMarkers = markers.filter((m) => m.category === cat);
        // Filter: show marker if hasNorms or value is not null (match Section11 logic)
        const visibleMarkers = catMarkers.filter((m) => m.hasNorms || m.value !== null);
        if (visibleMarkers.length === 0) return null;

        const isBloodTests = cat === 'Blood Tests & Biomarkers';
        const subcategories = isBloodTests
          ? [...new Set(visibleMarkers.map((m) => m.subcategory).filter(Boolean))]
          : [];

        return (
          <View key={cat} style={{ marginBottom: 8 }}>
            {/* Category header */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 12, marginBottom: 4, alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: FONT.bold,
                  textTransform: 'uppercase',
                  color: 'rgba(26, 54, 93, 0.7)',
                }}
              >
                {cat}
              </Text>
              <View style={{ flex: 1, height: 0.5, backgroundColor: COLORS.border, alignSelf: 'center' }} />
            </View>

            {/* Card wrapper */}
            <View style={styles.card}>
              {isBloodTests ? (
                // Blood tests: grouped by subcategory
                subcategories.map((sub) => {
                  const subMarkers = visibleMarkers.filter((m) => m.subcategory === sub);
                  if (subMarkers.length === 0) return null;
                  return (
                    <View key={sub}>
                      <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text
                          style={{
                            fontSize: 7,
                            fontFamily: FONT.bold,
                            textTransform: 'uppercase',
                            color: COLORS.textSecondary,
                          }}
                        >
                          {sub}
                        </Text>
                      </View>
                      {subMarkers.map((m) => (
                        <MarkerRow key={m.key} marker={m} />
                      ))}
                    </View>
                  );
                })
              ) : (
                // Flat list
                visibleMarkers.map((m) => (
                  <MarkerRow key={m.key} marker={m} />
                ))
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
