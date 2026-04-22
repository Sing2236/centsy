import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { ForumComment, ForumPost } from '../types/app'

type NewPost = {
  title: string
  body: string
  tags: string
  category: string
}

type CommunityPageProps = {
  activeForumPostId: string | null
  authDialog: ReactNode
  centsyLogo: string
  ensureCategory: (value: string) => string
  filteredForumPosts: ForumPost[]
  forumCategories: string[]
  forumCategoryCounts: Map<string, number>
  forumComments: Record<string, ForumComment[]>
  forumError: string
  forumLoading: boolean
  forumPosts: ForumPost[]
  forumSearch: string
  forumTagCounts: Map<string, number>
  forumTags: string[]
  formatForumUsername: (id: string) => string
  formatShortDate: (value: string) => string
  handleAddForumCategory: () => void
  handleCreateComment: (postId: string) => void
  handleCreatePost: () => void
  handleDeleteComment: (postId: string, commentId: string) => void
  handleDeletePost: (postId: string) => void
  homeUrl: string
  loadForumComments: (postId: string) => void
  loadForumPosts: () => void
  newCategoryName: string
  newComment: Record<string, string>
  newPost: NewPost
  onShowLogin: () => void
  parseTags: (value: string) => string[]
  selectedCategory: string
  selectedTag: string
  setActiveForumPostId: Dispatch<SetStateAction<string | null>>
  setForumSearch: Dispatch<SetStateAction<string>>
  setNewCategoryName: Dispatch<SetStateAction<string>>
  setNewComment: Dispatch<SetStateAction<Record<string, string>>>
  setNewPost: Dispatch<SetStateAction<NewPost>>
  setSelectedCategory: Dispatch<SetStateAction<string>>
  setSelectedTag: Dispatch<SetStateAction<string>>
  setTagSearch: Dispatch<SetStateAction<string>>
  showLogin: boolean
  tagSearch: string
  userEmail: string | null
  userId: string | null
  usernameModal: ReactNode
}

export default function CommunityPage({
  activeForumPostId,
  authDialog,
  centsyLogo,
  ensureCategory,
  filteredForumPosts,
  forumCategories,
  forumCategoryCounts,
  forumComments,
  forumError,
  forumLoading,
  forumPosts,
  forumSearch,
  forumTagCounts,
  forumTags,
  formatForumUsername,
  formatShortDate,
  handleAddForumCategory,
  handleCreateComment,
  handleCreatePost,
  handleDeleteComment,
  handleDeletePost,
  homeUrl,
  loadForumComments,
  loadForumPosts,
  newCategoryName,
  newComment,
  newPost,
  onShowLogin,
  parseTags,
  selectedCategory,
  selectedTag,
  setActiveForumPostId,
  setForumSearch,
  setNewCategoryName,
  setNewComment,
  setNewPost,
  setSelectedCategory,
  setSelectedTag,
  setTagSearch,
  showLogin,
  tagSearch,
  userEmail,
  userId,
  usernameModal,
}: CommunityPageProps) {
  return (
    <div className="forum-page">
      <header className="forum-header">
        <div className="brand">
          <span className="brand-mark">
            <img className="brand-logo" src={centsyLogo} alt="Centsy logo" />
          </span>
          <div>
            <p className="brand-name">Centsy Community</p>
            <p className="brand-tag">Real budgets, real people</p>
          </div>
        </div>
        <div className="forum-header-search">
          <input
            type="text"
            placeholder="Search posts, tags, categories"
            value={forumSearch}
            onChange={(event) => setForumSearch(event.target.value)}
          />
          {forumSearch ? (
            <button className="ghost small" type="button" onClick={() => setForumSearch('')}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="forum-actions">
          <button className="ghost" onClick={() => window.location.assign(homeUrl)}>
            Back to budget
          </button>
          {userEmail ? (
            <span className="tag">Signed in</span>
          ) : (
            <button className="solid" onClick={onShowLogin}>
              Log in
            </button>
          )}
        </div>
      </header>
      <main className="forum-main">
        <aside className="forum-rail">
          <div className="rail-card">
            <h3>Categories</h3>
            <div className="rail-filters">
              <button
                className={selectedCategory === 'all' ? 'pill active' : 'pill'}
                type="button"
                onClick={() => setSelectedCategory('all')}
              >
                All ({forumPosts.length})
              </button>
              {forumCategories.map((category) => (
                <button
                  className={selectedCategory === category ? 'pill active' : 'pill'}
                  key={`category-${category}`}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} ({forumCategoryCounts.get(category) ?? 0})
                </button>
              ))}
            </div>
            <div className="rail-add">
              <input
                type="text"
                placeholder="Add category"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
              <button className="ghost small" onClick={handleAddForumCategory}>
                Add
              </button>
            </div>
          </div>
          <div className="rail-card">
            <h3>Guidelines</h3>
            <p className="muted">Be kind, stay on topic, and share what has worked for you.</p>
          </div>
        </aside>
        <section className="forum-feed">
          <div className="forum-hero">
            <div>
              <h1>Ask the community</h1>
              <p>Post your question, get real answers, and share your own budgeting wins.</p>
            </div>
            <button className="ghost" onClick={loadForumPosts}>
              Refresh
            </button>
          </div>
          <div className="forum-search">
            <input
              type="text"
              placeholder="Search posts, tags, or categories"
              value={forumSearch}
              onChange={(event) => setForumSearch(event.target.value)}
            />
            {forumSearch || selectedTag || selectedCategory !== 'all' ? (
              <button
                className="ghost small"
                type="button"
                onClick={() => {
                  setForumSearch('')
                  setSelectedTag('')
                  setSelectedCategory('all')
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div className="forum-compose">
            <h3>Start a thread</h3>
            <div className="community-form">
              <label>
                Title
                <input
                  type="text"
                  value={newPost.title}
                  placeholder="Ex: How do you plan for irregular bills?"
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Question
                <textarea
                  rows={4}
                  value={newPost.body}
                  placeholder="Share the situation and what you are trying to solve."
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, body: event.target.value }))
                  }
                />
              </label>
              <label>
                Category
                <select
                  value={newPost.category}
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  {forumCategories.map((category) => (
                    <option key={`category-option-${category}`} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input
                  type="text"
                  value={newPost.tags}
                  placeholder="bills, debt, savings"
                  onChange={(event) =>
                    setNewPost((prev) => ({ ...prev, tags: event.target.value }))
                  }
                />
              </label>
              {forumTags.length ? (
                <div className="tag-row">
                  {forumTags.slice(0, 8).map((tag) => (
                    <button
                      className="tag-pill"
                      key={`quick-tag-${tag}`}
                      type="button"
                      onClick={() => {
                        const existing = parseTags(newPost.tags)
                        if (existing.includes(tag)) return
                        const next = [...existing, tag].join(', ')
                        setNewPost((prev) => ({ ...prev, tags: next }))
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              ) : null}
              <button className="solid small" onClick={handleCreatePost}>
                Post question
              </button>
            </div>
          </div>
          <div className="forum-list">
            {forumLoading ? (
              <p className="muted">Loading community posts...</p>
            ) : forumError ? (
              <p className="muted">{forumError}</p>
            ) : filteredForumPosts.length ? (
              filteredForumPosts.map((post) => {
                const isOpen = activeForumPostId === post.id
                const comments = forumComments[post.id] ?? []
                const authorLabel = formatForumUsername(post.user_id)
                return (
                  <article className="forum-thread" key={post.id}>
                    <div className="thread-main">
                      <div>
                        <h4>{post.title}</h4>
                        <p className="muted">{post.body}</p>
                      </div>
                      <div className="thread-meta">
                        <span className="tag-pill static">{authorLabel}</span>
                        <span>{formatShortDate(post.created_at)}</span>
                        <span>{comments.length} replies</span>
                        <span className="tag-pill static">{ensureCategory(post.category)}</span>
                        {post.user_id === userId ? (
                          <button className="ghost small" onClick={() => handleDeletePost(post.id)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {post.tags.length ? (
                      <div className="tag-row">
                        {post.tags.map((tag) => (
                          <span className="tag-pill" key={`${post.id}-${tag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <button
                      className="ghost small"
                      onClick={() => {
                        const nextId = isOpen ? null : post.id
                        setActiveForumPostId(nextId)
                        if (nextId && !forumComments[post.id]) {
                          loadForumComments(post.id)
                        }
                      }}
                    >
                      {isOpen ? 'Hide replies' : 'View thread'}
                    </button>
                    {isOpen ? (
                      <div className="forum-replies">
                        {comments.length ? (
                          comments.map((comment) => {
                            const replyMeta = [
                              formatForumUsername(comment.user_id),
                              formatShortDate(comment.created_at),
                            ]
                              .filter(Boolean)
                              .join(' · ')
                            return (
                              <div className="forum-reply" key={comment.id}>
                                <p>{comment.body}</p>
                                <div className="reply-meta">
                                  <span>{replyMeta}</span>
                                  {comment.user_id === userId ? (
                                    <button
                                      className="ghost small"
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                    >
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="muted">No replies yet.</p>
                        )}
                        <div className="reply-form">
                          <textarea
                            rows={3}
                            value={newComment[post.id] ?? ''}
                            placeholder="Share a tip or ask a follow-up."
                            onChange={(event) =>
                              setNewComment((prev) => ({
                                ...prev,
                                [post.id]: event.target.value,
                              }))
                            }
                          />
                          <button className="solid small" onClick={() => handleCreateComment(post.id)}>
                            Reply
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })
            ) : (
              <p className="muted">No posts match those filters. Try a different tag or category.</p>
            )}
          </div>
        </section>
        <aside className="forum-rail">
          <div className="rail-card">
            <h3>Popular tags</h3>
            <input
              type="text"
              placeholder="Search tags"
              value={tagSearch}
              onChange={(event) => setTagSearch(event.target.value)}
            />
            <div className="tag-row">
              {forumTags
                .filter((tag) => tag.includes(tagSearch.trim().toLowerCase()))
                .slice(0, 12)
                .map((tag) => (
                  <button
                    className={selectedTag === tag ? 'tag-pill active' : 'tag-pill'}
                    key={`tag-${tag}`}
                    type="button"
                    onClick={() => setSelectedTag((prev) => (prev === tag ? '' : tag))}
                  >
                    {tag} ({forumTagCounts.get(tag) ?? 0})
                  </button>
                ))}
            </div>
          </div>
          <div className="rail-card">
            <h3>Community tip</h3>
            <p className="muted">Share what you tried, what failed, and what finally clicked.</p>
          </div>
        </aside>
      </main>

      {showLogin ? authDialog : null}
      {usernameModal}
    </div>
  )
}
