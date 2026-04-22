import type { Dispatch, SetStateAction } from 'react'
import type { ForumComment, ForumPost } from '../../../types/app'

type CommunityModuleProps = {
  activeThreadId: string | null
  commentsByPost: Record<string, ForumComment[]>
  filteredPosts: ForumPost[]
  forumCategories: string[]
  forumLoading: boolean
  forumSearch: string
  loadComments: (postId: string) => void
  newComment: Record<string, string>
  newPost: { body: string; category: string; title: string }
  onDeleteComment: (postId: string, commentId: string) => void
  onDeletePost: (postId: string) => void
  onPostComment: (postId: string) => void
  onPostThread: () => void
  setActiveThreadId: Dispatch<SetStateAction<string | null>>
  setForumSearch: (value: string) => void
  setNewComment: Dispatch<SetStateAction<Record<string, string>>>
  setNewPost: Dispatch<SetStateAction<{ body: string; category: string; title: string }>>
  userEmail: string | null
  userId: string | null
}

export function CommunityModule({
  activeThreadId,
  commentsByPost,
  filteredPosts,
  forumCategories,
  forumLoading,
  forumSearch,
  loadComments,
  newComment,
  newPost,
  onDeleteComment,
  onDeletePost,
  onPostComment,
  onPostThread,
  setActiveThreadId,
  setForumSearch,
  setNewComment,
  setNewPost,
  userEmail,
  userId,
}: CommunityModuleProps) {
  return (
    <div className="figma-module-stack">
      <section className="figma-grid figma-grid-3">
        <article className="figma-panel">
          <div className="figma-panel-head">
            <h3>Categories</h3>
          </div>
          <div className="figma-chip-list">
            {forumCategories.map((category) => (
              <span className="figma-chip" key={category}>
                {category}
              </span>
            ))}
          </div>
        </article>

        <article className="figma-panel figma-panel-wide">
          <div className="figma-panel-head">
            <h3>Start thread</h3>
            <button className="figma-primary-button small" type="button" onClick={onPostThread}>
              Post
            </button>
          </div>
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
          </div>
        </article>
      </section>

      <section className="figma-panel">
        <div className="figma-panel-head">
          <h3>Threads</h3>
          <label className="figma-search figma-search-inline">
            <input
              type="text"
              placeholder="Search threads"
              value={forumSearch}
              onChange={(event) => setForumSearch(event.target.value)}
            />
          </label>
        </div>
        {forumLoading ? (
          <p className="figma-muted">Loading...</p>
        ) : (
          <div className="figma-list">
            {filteredPosts.map((post) => {
              const open = activeThreadId === post.id
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
                      <button
                        className="figma-primary-button small"
                        type="button"
                        onClick={() => {
                          const next = open ? null : post.id
                          setActiveThreadId(next)
                          if (next && !commentsByPost[post.id]) {
                            loadComments(post.id)
                          }
                        }}
                      >
                        {open ? 'Hide' : 'Open'}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="figma-thread-body">
                      <p className="figma-thread-copy">{post.body}</p>
                      <div className="figma-comment-list">
                        {comments.map((comment) => (
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
                      {userEmail ? (
                        <div className="figma-inline-form">
                          <input
                            type="text"
                            placeholder="Add reply"
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
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
