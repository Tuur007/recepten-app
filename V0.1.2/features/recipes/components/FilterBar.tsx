import { ScrollView, View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';

interface FilterChip {
  id: string;
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: string;
}

interface FilterBarProps {
  filters: FilterChip[];
  onClearFilters?: () => void;
  showClearButton?: boolean;
}

export function FilterBar({ filters, onClearFilters, showClearButton = true }: FilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.active);

  return (
    <View style={{ marginVertical: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        {filters.map((filter) => (
          <Pressable
            key={filter.id}
            onPress={filter.onPress}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 24,
              backgroundColor: filter.active ? colors.primary : '#E8DDD0',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {filter.icon && (
              <MaterialCommunityIcons
                name={filter.icon as any}
                size={14}
                color={filter.active ? colors.background : colors.secondary}
              />
            )}
            <Text
              style={{
                color: filter.active ? colors.background : colors.secondary,
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}

        {hasActiveFilters && showClearButton && onClearFilters && (
          <Pressable
            onPress={onClearFilters}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 24,
              backgroundColor: pressed ? '#D49A3A' : 'transparent',
              borderWidth: 1,
              borderColor: '#D49A3A',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            })}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={16} color="#D49A3A" />
            <Text
              style={{
                color: '#D49A3A',
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Clear
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
