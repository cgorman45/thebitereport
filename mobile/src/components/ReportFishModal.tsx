import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { apiAuthFetch } from '../lib/api';

const SPECIES = [
  { name: 'Yellowtail', color: '#eab308' },
  { name: 'Bluefin Tuna', color: '#3b82f6' },
  { name: 'Yellowfin Tuna', color: '#f59e0b' },
  { name: 'Calico Bass', color: '#22c55e' },
  { name: 'White Seabass', color: '#e2e8f0' },
  { name: 'Barracuda', color: '#8b5cf6' },
  { name: 'Dorado', color: '#22d3ee' },
  { name: 'Bonito', color: '#06b6d4' },
  { name: 'Rockfish', color: '#ef4444' },
  { name: 'Halibut', color: '#84cc16' },
  { name: 'Sheephead', color: '#f97316' },
];

const QUANTITIES = [
  { value: 'few', label: 'Few', detail: '1-5 fish' },
  { value: 'some', label: 'Some', detail: '5-15 fish' },
  { value: 'lots', label: 'Lots', detail: '15+ fish' },
  { value: 'wide-open', label: 'Wide Open!', detail: 'Non-stop' },
];

interface Props {
  visible: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ReportFishModal({ visible, lat, lng, onClose, onSubmit }: Props) {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<string | null>(null);
  const [bait, setBait] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setSelectedSpecies(null);
    setSelectedQuantity(null);
    setBait('');
    setDescription('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedSpecies) {
      Alert.alert('Select a species', 'Please pick at least one species before submitting.');
      return;
    }
    if (!selectedQuantity) {
      Alert.alert('Select a quantity', 'Please choose how many fish you saw.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        Alert.alert('Not signed in', 'You must be signed in to report fish activity.');
        setSubmitting(false);
        return;
      }

      await apiAuthFetch('/api/fish-reports', token, {
        method: 'POST',
        body: JSON.stringify({
          lat,
          lng,
          species: selectedSpecies,
          quantity: selectedQuantity,
          bait: bait.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      resetForm();
      onSubmit();
    } catch (err) {
      console.error('Fish report submit error:', err);
      Alert.alert('Submission failed', 'Could not submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const speciesColor = selectedSpecies
    ? (SPECIES.find((s) => s.name === selectedSpecies)?.color ?? colors.accent)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🐟 Report Fish Activity</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Coordinates */}
          <Text style={styles.coords}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Species grid */}
            <Text style={styles.sectionLabel}>SPECIES</Text>
            <View style={styles.speciesGrid}>
              {SPECIES.map((sp) => {
                const active = selectedSpecies === sp.name;
                return (
                  <TouchableOpacity
                    key={sp.name}
                    onPress={() => setSelectedSpecies(active ? null : sp.name)}
                    style={[
                      styles.speciesPill,
                      active && { borderColor: sp.color, backgroundColor: sp.color + '22' },
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: sp.color }]} />
                    <Text
                      style={[styles.speciesText, active && { color: sp.color }]}
                      numberOfLines={1}
                    >
                      {sp.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantity row */}
            <Text style={styles.sectionLabel}>QUANTITY</Text>
            <View style={styles.quantityRow}>
              {QUANTITIES.map((q) => {
                const active = selectedQuantity === q.value;
                return (
                  <TouchableOpacity
                    key={q.value}
                    onPress={() => setSelectedQuantity(active ? null : q.value)}
                    style={[
                      styles.quantityBtn,
                      active && { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
                    ]}
                  >
                    <Text style={[styles.quantityLabel, active && { color: colors.accent }]}>
                      {q.label}
                    </Text>
                    <Text style={styles.quantityDetail}>{q.detail}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bait / technique */}
            <Text style={styles.sectionLabel}>BAIT / TECHNIQUE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. live sardines, jig, fly..."
              placeholderTextColor={colors.muted}
              value={bait}
              onChangeText={setBait}
              returnKeyType="done"
            />

            {/* Description */}
            <Text style={styles.sectionLabel}>DESCRIPTION (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Any additional details about the bite..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                speciesColor ? { backgroundColor: speciesColor + 'dd' } : null,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  closeBtn: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  coords: { fontSize: 11, color: colors.muted, marginBottom: 14 },
  sectionLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  speciesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    width: '30%',
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  speciesText: { fontSize: 11, color: colors.muted, fontWeight: '600', flexShrink: 1 },
  quantityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quantityBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  quantityLabel: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  quantityDetail: { fontSize: 9, color: colors.muted, marginTop: 2 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    marginBottom: 14,
  },
  textarea: { height: 72 },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { fontSize: 15, fontWeight: '800', color: colors.bg },
});
