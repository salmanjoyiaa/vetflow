import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#2D3748',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 16,
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#17403a' },
  clinicDetails: { textAlign: 'right', fontSize: 8, color: '#718096' },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#17403a',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  body: { fontSize: 10, lineHeight: 1.4, color: '#4A5568' },
  metaRow: { flexDirection: 'row', marginBottom: 16, gap: 24 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 8, color: '#A0AEC0', marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 'bold' },
  vitalsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  vitalBox: {
    flex: 1,
    padding: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#A0AEC0',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
});

export interface TreatmentPdfProps {
  date: string;
  clinicName: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  doctorName: string;
  customerName: string;
  petName: string;
  petSpecies: string;
  reason: string;
  chiefComplaint: string;
  history?: string;
  examinationFindings?: string;
  diagnosis: string;
  treatmentPlan?: string;
  followUp?: string;
  temperatureC?: number | null;
  heartRateBpm?: number | null;
  respiratoryRate?: number | null;
  weightKg?: number | null;
  footerText?: string;
  accentColor?: string;
}

export default function TreatmentPdfDocument(props: TreatmentPdfProps) {
  const vitals = [
    props.temperatureC != null ? `Temp: ${props.temperatureC}°C` : null,
    props.heartRateBpm != null ? `HR: ${props.heartRateBpm} bpm` : null,
    props.respiratoryRate != null ? `RR: ${props.respiratoryRate}/min` : null,
    props.weightKg != null ? `Weight: ${props.weightKg} kg` : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Treatment Summary</Text>
          <View style={styles.clinicDetails}>
            <Text>{props.clinicName}</Text>
            <Text>{props.branchName}</Text>
            <Text>{props.branchAddress}</Text>
            <Text>{props.branchPhone}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Patient</Text>
            <Text style={styles.metaValue}>
              {props.petName} ({props.petSpecies})
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Owner</Text>
            <Text style={styles.metaValue}>{props.customerName}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Attending vet</Text>
            <Text style={styles.metaValue}>{props.doctorName}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Visit date</Text>
            <Text style={styles.metaValue}>{props.date}</Text>
          </View>
        </View>

        {vitals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vitals</Text>
            <View style={styles.vitalsRow}>
              {vitals.map((v, i) => (
                <View key={i} style={styles.vitalBox}>
                  <Text style={styles.body}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for visit</Text>
          <Text style={styles.body}>{props.reason}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chief complaint</Text>
          <Text style={styles.body}>{props.chiefComplaint}</Text>
        </View>

        {props.history && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            <Text style={styles.body}>{props.history}</Text>
          </View>
        )}

        {props.examinationFindings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Examination findings</Text>
            <Text style={styles.body}>{props.examinationFindings}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <Text style={styles.body}>{props.diagnosis}</Text>
        </View>

        {props.treatmentPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treatment plan</Text>
            <Text style={styles.body}>{props.treatmentPlan}</Text>
          </View>
        )}

        {props.followUp && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Follow-up recommendations</Text>
            <Text style={styles.body}>{props.followUp}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {props.footerText || `Thank you for your visit. — ${props.clinicName}`}
        </Text>
      </Page>
    </Document>
  );
}
