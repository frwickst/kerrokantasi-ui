import updeep from 'updeep';
import {handleActions} from 'redux-actions';

const receiveSectionComments = (state, {payload: {sectionId, data}}) => {
  // we must accept flattened as well as paginated comment listings
  let combinedResults = [];
  let count = 0;
  let next = null;
  if (Array.isArray(data)) {
    combinedResults = data;
    count = data.length;
  } else {
    combinedResults = state[sectionId] ? [...state[sectionId].results, ...data.results] : [];
    count = data.count;
    next = data.next;
  }
  // if ('results' in data) {
  //   combinedResults = state[sectionId] ? [...state[sectionId].results, ...data.results] : [];
  // } else {
  //   combinedResults = data;
  // }
  return updeep({
    [sectionId]: {
      isFetching: false,
      results: combinedResults,
      count,
      next
    }
  }, state);
};

const postedComment = (state, {payload: {sectionId, jumpTo, comment, response}}) => {
  // whenever we post, we want the newly posted comment displayed first and results reloaded
  if (comment && typeof comment === "number" && response && response.id) {
    const parentComment = state[sectionId].results.find(result => result.id === comment);
    // this means that sub comment section is open
    if (parentComment && Array.isArray(parentComment.subComments) && parentComment.subComments.length > 0) {
      const updatedSection = {
        ...state[sectionId],
        jumpTo,
        results: [
          ...state[sectionId].results.map((result) => {
            if (result.id === comment) {
              return { ...result, subComments: [...parentComment.subComments, response] };
            }
            return result;
          }),
        ]
      };

      return updeep({
        [sectionId]: updatedSection,
      }, state);
    }
    // Determine whether the comments sub comments were populated.
  }
  return updeep({
    [sectionId]: {
      jumpTo,
      results: [],
      ordering: '-created_at'
    }
  }, state);
};

const postedCommentVote = (state, {payload: {commentId, sectionId}}) => {
  // the vote went through
  const increment = (votes) => { return votes + 1; };
  const commentIndex = state[sectionId].results.findIndex(
    (comment) => { return comment.id === commentId; });
  return updeep({
    [sectionId]: {
      results: {
        [commentIndex]: {
          n_votes: increment
        }
      }
    }
  }, state);
};

const beginFetchSectionComments = (state, {payload: {sectionId, ordering, cleanFetch}}) => {
  if (state[sectionId] && state[sectionId].ordering === ordering && !cleanFetch) {
    return updeep({
      [sectionId]: {
        isFetching: true,
      }
    }, state);
  }
  return updeep({
    [sectionId]: {
      isFetching: true,
      results: [],
      ordering
    }
  }, state);
};

/**
 * Begin fetching the sub comments.
 * Show loading spinner on the parent comment description.
 */
const beginFetchSubComments = (state, {payload: {sectionId, commentId}}) => {
  const updatedSection = {
    ...state[sectionId],
    results: [
      ...state[sectionId].results.map((result) => {
        if (result.id === commentId) {
          return { ...result, loadingSubComments: true };
        }
        return result;
      }),
    ]
  };
  return updeep({
    [sectionId]: updatedSection,
  }, state);
};

/**
 * Once comments are fetched, update the store with sub comments.
 */
const subCommentsFetched = (state, {payload: {sectionId, commentId, data}}) => {
  const updatedSection = {
    ...state[sectionId],
    results: [
      ...state[sectionId].results.map((result) => {
        if (result.id === commentId) {
          return {
            ...result,
            loadingSubComments: false,
            subComments: data.results
          };
        }
        return result;
      })
    ]
  };
  return updeep({
    [sectionId]: updatedSection,
  }, state);
};

export default handleActions({
  receiveSectionComments,
  beginFetchSectionComments,
  beginFetchSubComments,
  postedComment,
  postedCommentVote,
  subCommentsFetched,
}, {});
