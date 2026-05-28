import { useQuery } from '@tanstack/react-query'
import { menuAPI } from '@/api/client'
import { MENU_ITEMS, CATEGORIES } from '@/api/mockData'

// Menu items — real API, fallback to mock
export function useMenuItems(categoryId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['menu', categoryId],
    queryFn:  () => menuAPI.getAll(categoryId ? { categoryId } : {}),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    items:     (data as any[]) || MENU_ITEMS,
    isLoading,
    fromAPI:   !!data && !error,
  }
}

// Categories
export function useCategories() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  menuAPI.getCategories,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  return {
    categories: (data as any[]) || CATEGORIES,
    isLoading,
  }
}

// Settings
import { settingsAPI } from '@/api/client'
export function useCafeSettings() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsAPI.get,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  return data
}
