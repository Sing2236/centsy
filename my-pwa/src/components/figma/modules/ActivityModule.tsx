import type { Dispatch, SetStateAction } from 'react'
import type { ForumComment, ForumPost } from '../../../types/app'

type SpendDraftInput = {
  amount: string
  category: string
  date: string
  direction: 'expense' | 'refund'
  merchant: string
  note: string
}

type ActivityModuleProps = {
  budgetCategories: Array<{ actual: number; name: string; planned: number }>
  commentsByPost: Record<string, ForumComment[]>
  filteredPosts: ForumPost[]
  forumCategories: string[]
  forumLoading: boolean
  forumSearch: string
  formatCurrency: (value: number) => string
  loadComments: (postId: string) => void
  newComment: Record<string, string>
  newPost: { body: string; category: string; title: string }
  newSpend: SpendDraftInput
  onAddSpendEntry: () => void
  onAdjustSpendEntry: (id: string, delta: number) => void
  onDeleteComment: (postId: string, commentId: string) => void
  onDeletePost: (postId: string) => void
  onDeleteSpendEntry: (id: string) => void
  onPostComment: (postId: string) => void
  onPostThread: () => void
  setForumSearch: (value: string) => void
  setNewComment: Dispatch<SetStateAction<Record<string, string>>>
  setNewPost: Dispatch<SetStateAction<{ body: string; category: string; title: string }>>
  setNewSpend: Dispatch<SetStateAction<SpendDraftInput>>
  spendEntries: Array<{ amount: number; category: string; date: string; id: string; merchant: string; note: string }>
  spendRollup: Array<{ logged: number; name: string; planned: number; remaining: number; status: string }>
  userEmail: string | null
  userId: string | null
}

export function ActivityModule({
  budgetCategories,
  commentsByPost,
  filteredPosts,
  forumCategories,
  forumLoading,
  forumSearch,
  formatCurrency,
  loadComments,
  newComment,
  newPost,
  newSpend,
  onAddSpendEntry,
  onAdjustSpendEntry,
  onDeleteComment,
  onDeletePost,
  onDeleteSpendEntry,
  onPostComment,
  onPostThread,
  setForumSearch,
  setNewComment,
  setNewPost,
  setNewSpend,
  spendEntries,
  spendRollup,
  userEmail,
  userId,
}: ActivityModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-2">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Log transaction</h3>
            <span className="figma-muted">Fast capture</span>
          </div>
          <div className="figma-form-grid">
            <label className="figma-field">
              <span>Merchant</span>
              <input
                type="text"
                value={newSpend.merchant}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, merchant: event.target.value }))
                }
              />
            </label>
            <label className="figma-field">
              <span>Amount</span>
              <input
                type="number"
                value={newSpend.amount}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </label>
            <label className="figma-field">
              <span>Date</span>
              <input
                type="date"
                value={newSpend.date}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>
            <label className="figma-field">
              <span>Category</span>
              <select
                value={newSpend.category}
                onChange={(event) =>
                  setNewSpend((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {budgetCategories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="figma-inline-actions">
              <button
                className={newSpend.direction === 'expense' ? 'figma-primary-button small' : 'figma-secondary-button small'}
                type="button"
                onClick={() => setNewSpend((prev) => ({ ...prev, direction: 'expense' }))}
              >
                Expense
              </button>
              <button
                className={newSpend.direction === 'refund' ? 'figma-primary-button small' : 'figma-secondary-button small'}
                type="button"
                onClick={() => setNewSpend((prev) => ({ ...prev, direction: 'refund' }))}
              >
                Refund
              </button>
            </div>
            <button className="figma-primary-button" type="button" onClick={onAddSpendEntry}>
              Add transaction
            </button>
          </div>
        </article>

        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Category rollup</h3>
          </div>
          <div className="figma-list">
            {spendRollup.map((row) => (
              <div className="figma-list-row" key={row.name}>
                <div>
                  <strong>{row.name}</strong>
                  <p>Planned {formatCurrency(row.planned)} • Logged {formatCurrency(row.logged)}</p>
                </div>
                <div className="figma-list-meta">
                  <strong>{formatCurrency(row.remaining)}</strong>
                  <small>{row.status}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Transactions</h3>
          <label className="figma-search figma-search-inline">
            <input
              type="text"
              placeholder="Search activity"
              value={forumSearch}
              onChange={(event) => setForumSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="figma-list">
          {spendEntries.map((entry) => (
            <div className="figma-list-row" key={entry.id}>
              <div>
                <strong>{entry.merchant}</strong>
                <p>{entry.category} • {entry.date}</p>
              </div>
              <div className="figma-list-meta">
                <strong>{formatCurrency(entry.amount)}</strong>
                <div className="figma-inline-actions">
                  <button className="figma-secondary-button small" type="button" onClick={() => onAdjustSpendEntry(entry.id, 5)}>
                    +$5
                  </button>
                  <button className="figma-secondary-button small" type="button" onClick={() => onDeleteSpendEntry(entry.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Community pulse</h3>
          <span className="figma-muted">Demoted from top-level nav</span>
        </div>
        <div className="figma-grid figma-grid-2">
          <div className="figma-form-grid">
            <label className="figma-field">
              <span>Title</span>
              <input
                type="text"
                value={newPost.title}
                onChange={(event) =>
                  setNewPost((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </label>
            <label className="figma-field">
              <span>Category</span>
              <select
                value={newPost.category}
                onChange={(event) =>
                  setNewPost((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {forumCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="figma-field figma-field-wide">
              <span>Question</span>
              <textarea
                rows={3}
                value={newPost.body}
                onChange={(event) =>
                  setNewPost((prev) => ({ ...prev, body: event.target.value }))
                }
              />
            </label>
            <button className="figma-primary-button" type="button" onClick={onPostThread}>
              Post thread
            </button>
          </div>
          <div className="figma-chip-list">
            {forumCategories.map((category) => (
              <span className="figma-chip" key={category}>
                {category}
              </span>
            ))}
          </div>
        </div>
        <div className="figma-list">
          {forumLoading ? <p className="figma-muted">Loading community…</p> : null}
          {filteredPosts.slice(0, 4).map((post) => {
            const comments = commentsByPost[post.id] ?? []
            return (
              <div className="figma-thread" key={post.id}>
                <div className="figma-list-row">
                  <div>
                    <strong>{post.title}</strong>
                    <p>{post.category} • {comments.length} replies</p>
                  </div>
                  <div className="figma-list-meta">
                    {post.user_id === userId ? (
                      <button className="figma-secondary-button small" type="button" onClick={() => onDeletePost(post.id)}>
                        Delete
                      </button>
                    ) : null}
                    <button className="figma-primary-button small" type="button" onClick={() => loadComments(post.id)}>
                      Open
                    </button>
                  </div>
                </div>
                {comments.length ? (
                  <div className="figma-comment-list">
                    {comments.slice(0, 2).map((comment) => (
                      <div className="figma-comment" key={comment.id}>
                        <span>{comment.body}</span>
                        {comment.user_id === userId ? (
                          <button className="figma-secondary-button small" type="button" onClick={() => onDeleteComment(post.id, comment.id)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {userEmail ? (
                  <div className="figma-inline-form">
                    <input
                      type="text"
                      placeholder="Quick reply"
                      value={newComment[post.id] ?? ''}
                      onChange={(event) =>
                        setNewComment((prev) => ({ ...prev, [post.id]: event.target.value }))
                      }
                    />
                    <button className="figma-primary-button small" type="button" onClick={() => onPostComment(post.id)}>
                      Reply
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
