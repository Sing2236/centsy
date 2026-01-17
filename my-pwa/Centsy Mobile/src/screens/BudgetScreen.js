import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Field } from '../components/Field'
import { SectionCard } from '../components/SectionCard'
import { theme } from '../theme'
import { formatCurrency } from '../utils'

export const BudgetScreen = ({
  categories,
  goals,
  bills,
  onUpdateCategories,
  onUpdateGoals,
  onUpdateBills,
}) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)

  const [categoryDraft, setCategoryDraft] = useState({
    name: '',
    planned: '',
  })
  const [goalDraft, setGoalDraft] = useState({
    name: '',
    amount: '',
    target: '',
  })
  const [billDraft, setBillDraft] = useState({
    name: '',
    amount: '',
    date: '',
  })

  const [editCategoryDraft, setEditCategoryDraft] = useState({
    name: '',
    planned: '',
  })
  const [editGoalDraft, setEditGoalDraft] = useState({
    name: '',
    amount: '',
    target: '',
  })
  const [editBillDraft, setEditBillDraft] = useState({
    name: '',
    amount: '',
    date: '',
  })

  const resetCategoryDraft = () => {
    setCategoryDraft({ name: '', planned: '' })
  }

  const resetGoalDraft = () => {
    setGoalDraft({ name: '', amount: '', target: '' })
  }

  const resetBillDraft = () => {
    setBillDraft({ name: '', amount: '', date: '' })
  }

  const closeEditModal = () => {
    setModalVisible(false)
    setEditingType(null)
    setEditingIndex(null)
  }

  const openEditModal = (type, index) => {
    if (type === 'category') {
      const item = categories[index]
      if (!item) return
      setEditCategoryDraft({ name: item.name, planned: String(item.planned) })
    }

    if (type === 'goal') {
      const item = goals[index]
      if (!item) return
      setEditGoalDraft({
        name: item.name,
        amount: String(item.amount),
        target: String(item.target),
      })
    }

    if (type === 'bill') {
      const item = bills[index]
      if (!item) return
      setEditBillDraft({
        name: item.name,
        amount: String(item.amount),
        date: String(item.date || ''),
      })
    }

    setEditingType(type)
    setEditingIndex(index)
    setModalVisible(true)
  }

  const handleAddCategory = () => {
    if (!categoryDraft.name.trim()) return
    const planned = Number(categoryDraft.planned || 0)
    onUpdateCategories([
      ...categories,
      { name: categoryDraft.name.trim(), planned, actual: planned },
    ])
    resetCategoryDraft()
  }

  const handleAddGoal = () => {
    if (!goalDraft.name.trim()) return
    const amount = Number(goalDraft.amount || 0)
    const target = Number(goalDraft.target || 0)
    onUpdateGoals([...goals, { name: goalDraft.name.trim(), amount, target }])
    resetGoalDraft()
  }

  const handleAddBill = () => {
    if (!billDraft.name.trim()) return
    const amount = Number(billDraft.amount || 0)
    onUpdateBills([
      ...bills,
      {
        name: billDraft.name.trim(),
        amount,
        date: billDraft.date || 'Upcoming',
        recurringDay: null,
      },
    ])
    resetBillDraft()
  }

  const handleUpdateCategory = () => {
    if (editingType !== 'category' || editingIndex === null) return
    if (!editCategoryDraft.name.trim()) return
    const planned = Number(editCategoryDraft.planned || 0)
    const next = [...categories]
    const existing = next[editingIndex]
    next[editingIndex] = {
      ...existing,
      name: editCategoryDraft.name.trim(),
      planned,
      actual: existing && existing.actual !== undefined ? existing.actual : planned,
    }
    onUpdateCategories(next)
    closeEditModal()
  }

  const handleUpdateGoal = () => {
    if (editingType !== 'goal' || editingIndex === null) return
    if (!editGoalDraft.name.trim()) return
    const amount = Number(editGoalDraft.amount || 0)
    const target = Number(editGoalDraft.target || 0)
    const next = [...goals]
    next[editingIndex] = {
      ...next[editingIndex],
      name: editGoalDraft.name.trim(),
      amount,
      target,
    }
    onUpdateGoals(next)
    closeEditModal()
  }

  const handleUpdateBill = () => {
    if (editingType !== 'bill' || editingIndex === null) return
    if (!editBillDraft.name.trim()) return
    const amount = Number(editBillDraft.amount || 0)
    const next = [...bills]
    next[editingIndex] = {
      ...next[editingIndex],
      name: editBillDraft.name.trim(),
      amount,
      date: editBillDraft.date || 'Upcoming',
    }
    onUpdateBills(next)
    closeEditModal()
  }

  const handleDeleteCategory = () => {
    if (editingType !== 'category' || editingIndex === null) return
    const next = categories.filter((_, index) => index !== editingIndex)
    onUpdateCategories(next)
    closeEditModal()
  }

  const handleDeleteGoal = () => {
    if (editingType !== 'goal' || editingIndex === null) return
    const next = goals.filter((_, index) => index !== editingIndex)
    onUpdateGoals(next)
    closeEditModal()
  }

  const handleDeleteBill = () => {
    if (editingType !== 'bill' || editingIndex === null) return
    const next = bills.filter((_, index) => index !== editingIndex)
    onUpdateBills(next)
    closeEditModal()
  }

  const handleUpdate = () => {
    if (editingType === 'category') handleUpdateCategory()
    if (editingType === 'goal') handleUpdateGoal()
    if (editingType === 'bill') handleUpdateBill()
  }

  const handleDelete = () => {
    if (editingType === 'category') handleDeleteCategory()
    if (editingType === 'goal') handleDeleteGoal()
    if (editingType === 'bill') handleDeleteBill()
  }

  const modalTitle =
    editingType === 'category'
      ? 'Edit category'
      : editingType === 'goal'
        ? 'Edit goal'
        : editingType === 'bill'
          ? 'Edit bill'
          : 'Edit item'

  const modalSubtitle =
    editingType === 'category'
      ? 'Update the name or planned amount.'
      : editingType === 'goal'
        ? 'Update progress or target.'
        : editingType === 'bill'
          ? 'Update the name, amount, or due date.'
          : ''

  const renderEditFields = () => {
    if (editingType === 'category') {
      return (
        <>
          <Field
            label="Category name"
            value={editCategoryDraft.name}
            onChangeText={(value) =>
              setEditCategoryDraft((prev) => ({ ...prev, name: value }))
            }
            placeholder="Groceries"
          />
          <Field
            label="Planned"
            value={editCategoryDraft.planned}
            onChangeText={(value) =>
              setEditCategoryDraft((prev) => ({ ...prev, planned: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
        </>
      )
    }

    if (editingType === 'goal') {
      return (
        <>
          <Field
            label="Goal name"
            value={editGoalDraft.name}
            onChangeText={(value) =>
              setEditGoalDraft((prev) => ({ ...prev, name: value }))
            }
            placeholder="Emergency fund"
          />
          <Field
            label="Current"
            value={editGoalDraft.amount}
            onChangeText={(value) =>
              setEditGoalDraft((prev) => ({ ...prev, amount: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
          <Field
            label="Target"
            value={editGoalDraft.target}
            onChangeText={(value) =>
              setEditGoalDraft((prev) => ({ ...prev, target: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
        </>
      )
    }

    if (editingType === 'bill') {
      return (
        <>
          <Field
            label="Bill name"
            value={editBillDraft.name}
            onChangeText={(value) =>
              setEditBillDraft((prev) => ({ ...prev, name: value }))
            }
            placeholder="Utilities"
          />
          <Field
            label="Amount"
            value={editBillDraft.amount}
            onChangeText={(value) =>
              setEditBillDraft((prev) => ({ ...prev, amount: value }))
            }
            keyboardType="numeric"
            placeholder="$"
          />
          <Field
            label="Due date"
            value={editBillDraft.date}
            onChangeText={(value) =>
              setEditBillDraft((prev) => ({ ...prev, date: value }))
            }
            placeholder="Mar 24"
          />
        </>
      )
    }

    return null
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Budget space</Text>
        <SectionCard title="Categories" subtitle="Plan what each category can spend.">
          {categories.map((item, index) => (
            <TouchableOpacity
              style={styles.row}
              key={`${item.name}-${index}`}
              onPress={() => openEditModal('category', index)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  Planned {formatCurrency(item.planned)}
                  {'\n'}
                  Actual {formatCurrency(item.actual)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.formBlock}>
            <Field
              label="Category name"
              value={categoryDraft.name}
              onChangeText={(value) =>
                setCategoryDraft((prev) => ({ ...prev, name: value }))
              }
              placeholder="Groceries"
            />
            <Field
              label="Planned"
              value={categoryDraft.planned}
              onChangeText={(value) =>
                setCategoryDraft((prev) => ({ ...prev, planned: value }))
              }
              keyboardType="numeric"
              placeholder="$"
            />
            <TouchableOpacity style={styles.action} onPress={handleAddCategory}>
              <Text style={styles.actionText}>Add category</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        <SectionCard title="Goals" subtitle="Track savings and debt milestones.">
          {goals.map((goal, index) => (
            <TouchableOpacity
              style={styles.row}
              key={`${goal.name}-${index}`}
              onPress={() => openEditModal('goal', index)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.rowTitle}>{goal.name}</Text>
                <Text style={styles.rowMeta}>
                  {formatCurrency(goal.amount)} of {formatCurrency(goal.target)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.formBlock}>
            <Field
              label="Goal name"
              value={goalDraft.name}
              onChangeText={(value) =>
                setGoalDraft((prev) => ({ ...prev, name: value }))
              }
              placeholder="Emergency fund"
            />
            <Field
              label="Current"
              value={goalDraft.amount}
              onChangeText={(value) =>
                setGoalDraft((prev) => ({ ...prev, amount: value }))
              }
              keyboardType="numeric"
              placeholder="$"
            />
            <Field
              label="Target"
              value={goalDraft.target}
              onChangeText={(value) =>
                setGoalDraft((prev) => ({ ...prev, target: value }))
              }
              keyboardType="numeric"
              placeholder="$"
            />
            <TouchableOpacity style={styles.action} onPress={handleAddGoal}>
              <Text style={styles.actionText}>Add goal</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        <SectionCard title="Bills" subtitle="Upcoming monthly bills you plan around.">
          {bills.map((bill, index) => (
            <TouchableOpacity
              style={styles.row}
              key={`${bill.name}-${index}`}
              onPress={() => openEditModal('bill', index)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.rowTitle}>{bill.name}</Text>
                <Text style={styles.rowMeta}>
                  Due {bill.date}
                  {'\n'}
                  Amount {formatCurrency(bill.amount)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.formBlock}>
            <Field
              label="Bill name"
              value={billDraft.name}
              onChangeText={(value) =>
                setBillDraft((prev) => ({ ...prev, name: value }))
              }
              placeholder="Utilities"
            />
            <Field
              label="Amount"
              value={billDraft.amount}
              onChangeText={(value) =>
                setBillDraft((prev) => ({ ...prev, amount: value }))
              }
              keyboardType="numeric"
              placeholder="$"
            />
            <Field
              label="Due date"
              value={billDraft.date}
              onChangeText={(value) =>
                setBillDraft((prev) => ({ ...prev, date: value }))
              }
              placeholder="Mar 24"
            />
            <TouchableOpacity style={styles.action} onPress={handleAddBill}>
              <Text style={styles.actionText}>Add bill</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            {modalSubtitle ? (
              <Text style={styles.modalSubtitle}>{modalSubtitle}</Text>
            ) : null}
            <View style={styles.modalFields}>{renderEditFields()}</View>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.action} onPress={handleUpdate}>
                <Text style={styles.actionText}>Save changes</Text>
              </TouchableOpacity>
              <View style={styles.editRow}>
                <TouchableOpacity style={styles.ghostButton} onPress={closeEditModal}>
                  <Text style={styles.ghostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
                  <Text style={styles.dangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  rowMeta: {
    fontSize: 12,
    color: theme.colors.inkMuted,
    marginTop: 4,
  },
  formBlock: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  action: {
    backgroundColor: theme.colors.ink,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  editActions: {
    gap: theme.spacing.sm,
  },
  editRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  ghostButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostText: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  dangerButton: {
    flex: 1,
    backgroundColor: theme.colors.accentDark,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.inkMuted,
  },
  modalFields: {
    gap: theme.spacing.sm,
  },
})
