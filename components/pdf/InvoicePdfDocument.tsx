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
    backgroundColor: '#0F172A',
    marginRight: 6,
    borderRadius: 3
  },
  logoText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#0F172A',
    letterSpacing: -0.5
  },
  clinicDetails: { 
    textAlign: 'right',
    fontSize: 8,
    color: '#718096' 
  },
  titleSection: {
    marginBottom: 25
  },
  invoiceTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#0F172A' 
  },
  invoiceNumber: { 
    fontSize: 10, 
    color: '#718096',
    marginTop: 4 
  },
  metaContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 30 
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
  table: { 
    width: 'auto', 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRightWidth: 0, 
    borderBottomWidth: 0, 
    marginTop: 10 
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
    padding: 8, 
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
    padding: 8,
    fontSize: 9
  },
  colDesc: { width: '50%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  totalSection: { 
    marginTop: 30, 
    alignSelf: 'flex-end', 
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10
  },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  totalLabel: { 
    color: '#718096', 
    fontSize: 9 
  },
  totalVal: { 
    color: '#2D3748', 
    fontSize: 9,
    fontWeight: 'bold' 
  },
  grandTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8 
  },
  grandTotalLabel: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: '#0F172A' 
  },
  grandTotalVal: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: '#17403a' 
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

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoicePdfProps {
  invoiceNumber: string;
  date: string;
  clinicName: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  customerName: string;
  customerPhone: string;
  petName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxPercentage: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  brandName?: string;
  accentColor?: string;
  footerText?: string;
}

export default function InvoicePdfDocument({
  invoiceNumber,
  date,
  clinicName,
  branchName,
  branchAddress,
  branchPhone,
  customerName,
  customerPhone,
  petName,
  items,
  subtotal,
  discount,
  taxPercentage,
  taxAmount,
  total,
  paymentMethod,
  brandName,
  accentColor = '#0F172A',
  footerText,
}: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoPlaceholder, { backgroundColor: accentColor }]} />
            <Text style={[styles.logoText, { color: accentColor }]}>{brandName || clinicName}</Text>
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
          <Text style={styles.invoiceTitle}>INVOICE STATEMENT</Text>
          <Text style={styles.invoiceNumber}>Invoice #: {invoiceNumber}</Text>
        </View>

        {/* METADATA */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaHeading}>Billed To</Text>
            <Text style={styles.metaText}>{customerName}</Text>
            <Text style={styles.metaText}>Phone: {customerPhone}</Text>
            <Text style={styles.metaText}>Patient: {petName}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaHeading}>Invoice Details</Text>
            <Text style={styles.metaText}>Date: {date}</Text>
            <Text style={styles.metaText}>Payment Method: {paymentMethod.toUpperCase()}</Text>
            <Text style={styles.metaText}>Status: PAID</Text>
          </View>
        </View>

        {/* LEDGER ITEMS TABLE */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.tableRow, { backgroundColor: '#F7FAFC' }]}>
            <Text style={[styles.tableColHeader, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableColHeader, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableColHeader, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.tableColHeader, styles.colTotal]}>Total</Text>
          </View>

          {/* Body Rows */}
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.colDesc]}>{item.name}</Text>
              <Text style={[styles.tableCol, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCol, styles.colPrice]}>${Number(item.unit_price).toFixed(2)}</Text>
              <Text style={[styles.tableCol, styles.colTotal]}>${Number(item.total).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS DISPLAY SECTION */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalVal}>${subtotal.toFixed(2)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalVal, { color: '#E53E3E' }]}>-${discount.toFixed(2)}</Text>
            </View>
          )}
          {taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxPercentage}%):</Text>
              <Text style={styles.totalVal}>${taxAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Paid:</Text>
            <Text style={styles.grandTotalVal}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>{footerText || `Thank you for trusting ${brandName || clinicName} with your pet's medical care.`}</Text>
          <Text style={{ marginTop: 4 }}>This document is a secure system-generated payment receipt.</Text>
        </View>

      </Page>
    </Document>
  );
}
