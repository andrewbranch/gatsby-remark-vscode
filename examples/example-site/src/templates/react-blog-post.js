import React, { createContext, useContext, useState } from "react"
import { Link, graphql } from "gatsby"
import RehypeReact from "rehype-react"
import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"
import { rhythm, scale } from "../utils/typography"

const CodeBlockContext = createContext([])

function CoolCodeBlock(props) {
  const [isRotating, setIsRotating] = useState({})
  const codeBlock = (useContext(CodeBlockContext) || [])[+props["data-index"]]
  return codeBlock ? (
    <pre className={codeBlock.preClassName}>
      <code className={codeBlock.codeClassName}>
        {codeBlock.tokenizedLines.map(({ tokens, className }, i) => (
          <div key={i} className={className} style={{ display: "block" }}>
            {tokens.map(({ startIndex, text, className }) => (
              <span
                className={[
                  className,
                  isRotating[`${i}/${startIndex}`] ? "rotating" : "",
                ].join(" ")}
                key={startIndex}
                onClick={() =>
                  setIsRotating({
                    ...isRotating,
                    [`${i}/${startIndex}`]: !isRotating[`${i}/${startIndex}`],
                  })
                }
                style={{
                  cursor: "pointer",
                  animationDuration: `${text.length * 80}ms`,
                }}
              >
                {text}
              </span>
            ))}
          </div>
        ))}
      </code>
    </pre>
  ) : null
}

function CodeBlockWithLineNumbers(props) {
  const codeBlock = (useContext(CodeBlockContext) || [])[+props["data-index"]]
  return codeBlock ? (
    <div className={codeBlock.preClassName}>
      <code className={codeBlock.codeClassName}>
        {codeBlock.tokenizedLines.map(({ html }, i) => (
          <div className="line-wrapper">
            <div className="line-number">{(codeBlock.meta ? codeBlock.meta.startLine : 1) + i}</div>
            <div className="line-contents" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ))}
      </code>
    </div>
  ) : null
}

const codeComponents = {
  CoolCodeBlock,
  CodeBlockWithLineNumbers
};

class BlogPostTemplate extends React.Component {
  renderAst = new RehypeReact({
    createElement: React.createElement,
    components: {
      pre: codeComponents[this.props.data.markdownRemark.frontmatter.codeComponent] || CoolCodeBlock
    },
  }).Compiler;

  render() {
    window.props = this.props
    const post = this.props.data.markdownRemark
    const siteTitle = this.props.data.site.siteMetadata.title
    const { previous, next } = this.props.pageContext

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
        />
        <article>
          <style>{`
            @keyframes rotating {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .rotating {
              display: inline-block;
              animation: rotating 500ms linear infinite;
            }
            .line-wrapper { display: flex; }
            .line-number {
              background: rgba(255, 255, 255, 0.1);
              flex: 0 0 40px;
              text-align: right;
              padding: 0 20px;
            }
            .line-contents {
              flex: 1 0 auto;
              white-space: pre;
            }
          `}</style>
          <header>
            <h1
              style={{
                marginTop: rhythm(1),
                marginBottom: 0,
              }}
            >
              {post.frontmatter.title}
            </h1>
            <p
              style={{
                ...scale(-1 / 5),
                display: `block`,
                marginBottom: rhythm(1),
              }}
            >
              {post.frontmatter.date}
            </p>
          </header>
          <CodeBlockContext.Provider value={post.grvscCodeBlocks}>
            {this.renderAst(post.htmlAst)}
          </CodeBlockContext.Provider>
          <hr
            style={{
              marginBottom: rhythm(1),
            }}
          />
          <footer>
            <Bio />
          </footer>
        </article>

        <nav>
          <ul
            style={{
              display: `flex`,
              flexWrap: `wrap`,
              justifyContent: `space-between`,
              listStyle: `none`,
              padding: 0,
            }}
          >
            <li>
              {previous && (
                <Link to={previous.fields.slug} rel="prev">
                  ← {previous.frontmatter.title}
                </Link>
              )}
            </li>
            <li>
              {next && (
                <Link to={next.fields.slug} rel="next">
                  {next.frontmatter.title} →
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </Layout>
    )
  }
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query($slug: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      htmlAst
      frontmatter {
        codeComponent
        title
        date(formatString: "MMMM DD, YYYY")
        description
      }
      grvscCodeBlocks {
        meta
        preClassName
        codeClassName
        tokenizedLines {
          html
          className
          tokens {
            startIndex
            className
            text
          }
        }
      }
    }
  }
`
