import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#2D3748',
    backgroundColor: '#FFFFFF' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0', 
    paddingBottom: 20, 
    marginBottom: 20 
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoPlaceholder: {
    width: 14,
    height: 14,
    backgroundColor: '#17403a',
    marginRight: 6,
    borderRadius: 3
  },
  logoText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#17403a',
    letterSpacing: -0.5
  },
  clinicDetails: { 
    textAlign: 'right',
    fontSize: 8,
    color: '#718096' 
  },
  titleSection: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  prescriptionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#0F172A' 
  },
  prescriptionDate: { 
    fontSize: 9, 
    color: '#718096' 
  },
  metaContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    paddingBottom: 15
  },
  metaBlock: { 
    width: '45%' 
  },
  metaHeading: { 
    fontSize: 8, 
    fontWeight: 'bold', 
    color: '#A0AEC0', 
    textTransform: 'uppercase', 
    marginBottom: 6,
    letterSpacing: 0.5
  },
  metaText: { 
    fontSize: 9, 
    color: '#2D3748',
    lineHeight: 1.4
  },
  clinicalSection: {
    marginBottom: 25,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7'
  },
  clinicalLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4A5568',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  clinicalText: {
    fontSize: 9,
    color: '#2D3748',
    lineHeight: 1.4,
    marginBottom: 10
  },
  rxHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#17403a',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#17403a',
    paddingBottom: 4
  },
  table: { 
    width: 'auto', 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRightWidth: 0, 
    borderBottomWidth: 0, 
    marginTop: 5 
  },
  tableRow: { 
    flexDirection: 'row' 
  },
  tableColHeader: { 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderLeftWidth: 0, 
    borderTopWidth: 0, 
    backgroundColor: '#F7FAFC', 
    padding: 6, 
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4A5568'
  },
  tableCol: { 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderLeftWidth: 0, 
    borderTopWidth: 0, 
    padding: 6,
    fontSize: 9
  },
  colMedicine: { width: '40%', fontWeight: 'bold' },
  colDosage: { width: '15%' },
  colFreq: { width: '20%' },
  colDur: { width: '15%' },
  colQty: { width: '10%', textAlign: 'center' },
  
  signatureArea: {
    marginTop: 40,
    alignSelf: 'flex-end',
    width: '35%',
    textAlign: 'center'
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#718096',
    marginTop: 40,
    paddingTop: 6,
    fontSize: 9,
    color: '#4A5568',
    fontWeight: 'bold'
  },
  footer: { 
    position: 'absolute', 
    bottom: 40, 
    left: 40, 
    right: 40, 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0', 
    paddingTop: 15, 
    textAlign: 'center', 
    fontSize: 8, 
    color: '#A0AEC0' 
  }
});

interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity_requested: number;
}

interface PrescriptionPdfProps {
  date: string;
  clinicName: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  doctorName: string;
  customerName: string;
  petName: string;
  petSpecies: string;
  petBreed: string;
  diagnosis: string;
  treatmentPlan: string;
  followUp: string;
  items: PrescriptionItem[];
  brandName?: string;
  accentColor?: string;
  footerText?: string;
}

export default function PrescriptionPdfDocument({
  date,
  clinicName,
  branchName,
  branchAddress,
  branchPhone,
  doctorName,
  customerName,
  petName,
  petSpecies,
  petBreed,
  diagnosis,
  treatmentPlan,
  followUp,
  items,
  brandName,
  footerText,
  accentColor = '#0F172A',
}: PrescriptionPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoPlaceholder, { backgroundColor: accentColor }]} />
            <Text style={[styles.logoText, { color: accentColor }]}>{brandName || clinicName} Rx</Text>
          </View>
          <View style={styles.clinicDetails}>
            <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>{clinicName}</Text>
            <Text>{branchName}</Text>
            <Text>{branchAddress}</Text>
            <Text>Phone: {branchPhone}</Text>
          </View>
        </View>

        {/* TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.prescriptionTitle}>VETERINARY PRESCRIPTION</Text>
          <Text style={styles.prescriptionDate}>Date: {date}</Text>
        </View>

        {/* METADATA */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaHeading}>Patient Info</Text>
            <Text style={styles.metaText}>Patient Name: {petName}</Text>
            <Text style={styles.metaText}>Species/Breed: {petSpecies} {petBreed ? `(${petBreed})` : ''}</Text>
            <Text style={styles.metaText}>Owner: {customerName}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaHeading}>Prescribing Vet</Text>
            <Text style={styles.metaText}>Dr. {doctorName}</Text>
            <Text style={styles.metaText}>Status: FINALIZED</Text>
          </View>
        </View>

        {/* CLINICAL SUMMARY NOTES */}
        <View style={styles.clinicalSection}>
          <Text style={styles.clinicalLabel}>Clinical Diagnosis</Text>
          <Text style={styles.clinicalText}>{diagnosis}</Text>
          
          {treatmentPlan ? (
            <>
              <Text style={styles.clinicalLabel}>Treatment Directions</Text>
              <Text style={styles.clinicalText}>{treatmentPlan}</Text>
            </>
          ) : null}

          {followUp ? (
            <>
              <Text style={styles.clinicalLabel}>Follow-up recommendation</Text>
              <Text style={[styles.clinicalText, { marginBottom: 0 }]}>{followUp}</Text>
            </>
          ) : null}
        </View>

        {/* RX HEADER */}
        <Text style={styles.rxHeader}>Rx Medication List</Text>

        {/* PRESCRIBED MEDICINES TABLE */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.tableRow, { backgroundColor: '#F7FAFC' }]}>
            <Text style={[styles.tableColHeader, styles.colMedicine]}>Medicine / Dosage Details</Text>
            <Text style={[styles.tableColHeader, styles.colDosage]}>Dosage</Text>
            <Text style={[styles.tableColHeader, styles.colFreq]}>Frequency</Text>
            <Text style={[styles.tableColHeader, styles.colDur]}>Duration</Text>
            <Text style={[styles.tableColHeader, styles.colQty]}>Qty</Text>
          </View>

          {/* Body Rows */}
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={[styles.tableCol, styles.colMedicine]}>
                <Text style={{ fontWeight: 'bold', color: '#0F172A' }}>{item.medicine_name}</Text>
                {item.instructions && (
                  <Text style={{ fontSize: 7, color: '#718096', marginTop: 2 }}>
                    Instructions: {item.instructions}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCol, styles.colDosage]}>{item.dosage}</Text>
              <Text style={[styles.tableCol, styles.colFreq]}>{item.frequency}</Text>
              <Text style={[styles.tableCol, styles.colDur]}>{item.duration}</Text>
              <Text style={[styles.tableCol, styles.colQty]}>{item.quantity_requested}</Text>
            </View>
          ))}
        </View>

        {/* SIGNATURE BLOCK */}
        <View style={styles.signatureArea}>
          <Text style={styles.signatureLine}>Dr. {doctorName}</Text>
          <Text style={{ fontSize: 7, color: '#A0AEC0', marginTop: 2 }}>Attending Veterinarian</Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>This prescription is only valid for veterinary use.</Text>
          <Text style={{ marginTop: 4 }}>{footerText || `Issued by ${clinicName}`}</Text>
        </View>

      </Page>
    </Document>
  );
}
