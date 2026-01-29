/**
 * GreenSense AR - Quantity Selector Component
 * 
 * Allows users to adjust the quantity of scanned items.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, TextStyles } from '../theme';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
}

/**
 * QuantitySelector Component
 * 
 * Increment/decrement control for quantity adjustment.
 */
export function QuantitySelector({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99,
  label,
  unit = 'x',
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, quantity <= min && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={quantity <= min}
        >
          <Ionicons 
            name="remove" 
            size={18} 
            color={quantity <= min ? Colors.textTertiary : Colors.textPrimary} 
          />
        </TouchableOpacity>
        
        <View style={styles.quantityDisplay}>
          <Text style={styles.quantity}>{unit}{quantity}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.button, quantity >= max && styles.buttonDisabled]}
          onPress={handleIncrement}
          disabled={quantity >= max}
        >
          <Ionicons 
            name="add" 
            size={18} 
            color={quantity >= max ? Colors.textTertiary : Colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.base,
  },
  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  quantityDisplay: {
    paddingHorizontal: Spacing.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  quantity: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});

export default QuantitySelector;

