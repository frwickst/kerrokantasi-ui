import React, {Component} from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import {FormGroup, FormControl, ControlLabel} from 'react-bootstrap';
import {get, isEmpty, keys, throttle, find} from 'lodash';
import { Waypoint } from 'react-waypoint';
import PropTypes from 'prop-types';
import WrappedCommentList from './Hearing/CommentList';
import LoadSpinner from './LoadSpinner';
import Icon from '../utils/Icon';
import MapdonKSVPlugin from './plugins/legacy/mapdon-ksv';
import MapQuestionnaire from './plugins/MapQuestionnaire';
import QuestionResults from './QuestionResults';
import CommentForm from './BaseCommentForm';
import {getNickname, getAuthorDisplayName} from '../utils/user';

const ORDERING_CRITERIA = {
  CREATED_AT_DESC: '-created_at',
  CREATED_AT_ASC: 'created_at',
  POPULARITY_DESC: '-n_votes',
  POPULARITY_ASC: 'n_votes',
};

export class SortableCommentListComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showLoader: false,
      collapseForm: false,
      answers: this.props.section.questions.map(
        question => ({
          question: question.id,
          type: question.type,
          answers: []
        })
      )
    };

    this.fetchMoreComments = throttle(this._fetchMoreComments).bind(this);
    this.handleReachBottom = this.handleReachBottom.bind(this);
    this.fetchComments = this.fetchComments.bind(this);
  }

  _fetchMoreComments() {
    const {section: {id: sectionId}, sectionComments: {ordering, next}, fetchMoreComments} = this.props;

    if (next) {
      fetchMoreComments(sectionId, ordering, next);
    }
  }

  fetchComments(sectionId, ordering) {
    // if a plugin is involved, we must fetch all the comments for display, not just a select few
    const {fetchComments, fetchAllComments, section, hearingSlug, displayVisualization} = this.props;
    if (displayVisualization && section.plugin_identifier) {
      return fetchAllComments(hearingSlug, sectionId, ordering);
    }
    return fetchComments(sectionId, ordering);
  }

  componentDidMount() {
    const {section, sectionComments} = this.props;
    // comment fetching may already be taking place in the plugin!
    if (!get(sectionComments, 'isFetching')) {
      this.fetchComments(section.id, ORDERING_CRITERIA.POPULARITY_DESC);
    }
  }

  componentWillReceiveProps(nextProps) {
    const {section} = this.props;
    const isFetching = get(nextProps.sectionComments, 'isFetching');
    const results = get(nextProps.sectionComments, 'results');
    this.setState({
      showLoader: isFetching,
      collapseForm: false, // whenever things change, no longer force the form to collapse
    });

    if (!isFetching && !this.props.user && nextProps.user) {
      this.fetchComments(section.id, ORDERING_CRITERIA.POPULARITY_DESC);
    }

    if (!isFetching && this.props.user && !nextProps.user) {
      this.fetchComments(section.id, ORDERING_CRITERIA.POPULARITY_DESC);
    }

    if (section.id !== nextProps.section.id) {
      this.fetchComments(nextProps.section.id, ORDERING_CRITERIA.POPULARITY_DESC);
    }

    if (!isFetching && results && results.length === 0 && nextProps.section.n_comments !== 0) {
      // comments have to be reloaded and form collapsed due to posting
      this.fetchComments(nextProps.section.id, nextProps.sectionComments.ordering);
      this.setState({
        collapseForm: true,
      });
    }
  }


  /**
   * When posting a new comment.
   */
  onPostComment = (text, authorName, pluginData, geojson, label, images) => {
    const {section} = this.props;
    const answers = this.state.answers;
    const commentData = {text, authorName, pluginData, geojson, label, images, answers};
    if (this.props.onPostComment) {
      this.props.onPostComment(section.id, commentData);
    }
  }

  /**
   * When posting a reply to a comment.
   */
  handlePostReply = (sectionId, data) => {
    this.props.onPostComment(sectionId, data);
  }


  onChangeAnswers = (questionId, questionType, value) => {
    const oldAnswer = find(this.state.answers, answer => answer.question === questionId);
    if (questionType === 'single-choice') {
      this.setState(
        {
          answers: [
            ...this.state.answers.filter(answer => answer.question !== questionId),
            {
              question: questionId,
              type: questionType,
              answers: [value]
            }
          ]
        }
      );
    } else if (questionType === 'multiple-choice' && oldAnswer && oldAnswer.answers.includes(value)) {
      this.setState(
        {
          answers: [
            ...this.state.answers.filter(answer => answer.question !== questionId),
            {
              ...oldAnswer,
              answers: oldAnswer.answers.filter(answer => answer !== value)
            }
          ]
        }
      );
    } else if (questionType === 'multiple-choice' && oldAnswer) {
      this.setState(
        {
          answers: [
            ...this.state.answers.filter(answer => answer.question !== questionId),
            {
              ...oldAnswer,
              answers: [
                ...oldAnswer.answers,
                value
              ]
            }
          ]
        }
      );
    }
  }

  handleReachBottom() {
    const {sectionComments} = this.props;
    if (sectionComments && sectionComments.count !== sectionComments.results.length) {
      setTimeout(() => this.fetchMoreComments(), 1000);
      this.setState({showLoader: true});
    }
  }

  renderMapVisualization() {
    const {section, sectionComments} = this.props;
    return (
      <div className="comments-visualization">
        <MapQuestionnaire
          data={section.plugin_data}
          pluginPurpose="viewHeatmap"
          comments={sectionComments.results}
          pluginSource={section.plugin_iframe_url}
        />
        <div className="image-caption">Kaikkien merkintöjen ja äänien tiheyskartta.</div>
      </div>
    );
  }

  renderPluginContent() {
    const {section} = this.props;
    const comments = this.props.sectionComments.results;
    if (typeof window === 'undefined' || !section.plugin_identifier) {
      return null;
    }
    switch (section.plugin_identifier) {
      case 'mapdon-ksv':
        // This is legacy support.
        return (
          <div className="comments-visualization">
            <MapdonKSVPlugin data={section.plugin_data} pluginPurpose="viewComments" comments={comments} />
            <div className="image-caption">Kaikki annetut kommentit sekä siirretyt ja lisätyt asemat kartalla.</div>
            <MapdonKSVPlugin data={section.plugin_data} pluginPurpose="viewHeatmap" comments={comments} />
            <div className="image-caption">Siirrettyjen ja lisättyjen asemien tiheyskartta.</div>
          </div>
        );
      case 'map-questionnaire':
        // Only display visualization if the plugin allows non-fullscreen rendering
        if (!section.plugin_fullscreen) {
          return this.renderMapVisualization();
        }
        return null;
      default:
        return null; // The plugin does not support result visualization.
    }
  }

  render() {
    const {
      displayVisualization,
      hearingId,
      intl,
      canComment,
      section,
      sectionComments,
      canVote,
      user,
      published,
      language,
      closed
    } = this.props;

    // const mockSection = Object.assign({}, section);
    // mockSection.questions = mockQuestions;

    const showCommentList =
      section && sectionComments && get(sectionComments, 'results') && !isEmpty(sectionComments.results);
    const commentForm = canComment && published ? (
      <div className="row">
        <div className="comment-form-container">
          <CommentForm
            hearingId={hearingId}
            onPostComment={this.onPostComment}
            defaultNickname={getNickname(user)}
            nicknamePlaceholder={getAuthorDisplayName(user) || this.props.intl.formatMessage({id: "anonymous"})}
            collapseForm={this.state.collapseForm}
            section={section}
            language={language}
            onChangeAnswers={this.onChangeAnswers}
            answers={this.state.answers}
            closed={closed}
            loggedIn={!isEmpty(user)}
            user={user}
          />
        </div>
      </div>
    ) : null;
    const pluginContent = showCommentList && displayVisualization ? this.renderPluginContent() : null;
    return (
      <div>
        {section.commenting !== 'none' &&
        <div className="sortable-comment-list">
          {closed &&
            <div style={{padding: '12px', marginBottom: '24px', background: '#ffffff'}}>
              {
                section.questions.map((question) =>
                  <QuestionResults key={question.id} question={question} language={language} />)
              }
            </div>
        }
          {commentForm}
          <div>
            <h2>
              <FormattedMessage id="comments" />
              <div className="commenticon">
                <Icon name="comment-o" />&nbsp;{section.n_comments}
              </div>
            </h2>
            {pluginContent}
            {this.state.showLoader && (
              <div className="sortable-comment-list__loader">
                <LoadSpinner />
              </div>
            )}
            {showCommentList &&
              <div className="row">
                <form className="sort-selector">
                  <FormGroup controlId="sort-select">
                    <ControlLabel>
                      <FormattedMessage id="commentOrder" />
                    </ControlLabel>
                    <div className="select">
                      <FormControl
                        componentClass="select"
                        onChange={event => {
                          this.fetchComments(section.id, event.target.value);
                        }}
                        value={get(sectionComments, 'ordering')}
                      >
                        {keys(ORDERING_CRITERIA).map(key =>
                          <FormattedMessage id={key} key={key}>
                            {(message) => <option value={ORDERING_CRITERIA[key]}>{message}</option>}
                          </FormattedMessage>
                        )}
                      </FormControl>
                    </div>
                  </FormGroup>
                </form>
              </div>}

            {showCommentList &&
              <div>
                <WrappedCommentList
                  canReply={canComment && published}
                  onPostReply={this.handlePostReply}
                  onGetSubComments={this.props.onGetSubComments}
                  canVote={canVote}
                  comments={sectionComments.results}
                  defaultNickname={getNickname(user)}
                  hearingId={hearingId}
                  intl={intl}
                  isLoading={this.state.showLoader}
                  jumpTo={sectionComments.jumpTo}
                  language={language}
                  nicknamePlaceholder={getAuthorDisplayName(user) || this.props.intl.formatMessage({id: "anonymous"})}
                  onDeleteComment={this.props.onDeleteComment}
                  onEditComment={this.props.onEditComment}
                  onPostVote={this.props.onPostVote}
                  section={section}
                  totalCount={sectionComments.count}
                  user={user}
                />
                <Waypoint onEnter={this.handleReachBottom} />
              </div>}
          </div>
        </div>}
      </div>
    );
  }
}

SortableCommentListComponent.propTypes = {
  canComment: PropTypes.bool,
  canVote: PropTypes.bool,
  closed: PropTypes.bool,
  displayVisualization: PropTypes.bool,
  fetchAllComments: PropTypes.func,
  fetchComments: PropTypes.func,
  fetchMoreComments: PropTypes.func,
  hearingId: PropTypes.string,
  hearingSlug: PropTypes.string,
  intl: intlShape.isRequired,
  language: PropTypes.string,
  onDeleteComment: PropTypes.func,
  onEditComment: PropTypes.func,
  onGetSubComments: PropTypes.func,
  onPostComment: PropTypes.func,
  onPostVote: PropTypes.func,
  published: PropTypes.bool,
  section: PropTypes.object,
  sectionComments: PropTypes.object,
  user: PropTypes.object,
};

const mapStateToProps = (state, {section: {id: sectionId}}) => ({
  sectionComments: get(state, `sectionComments.${sectionId}`),
  user: get(state, 'user').data,
  language: state.language
});

export default connect(mapStateToProps)(injectIntl(SortableCommentListComponent));
