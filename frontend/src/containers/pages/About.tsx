import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { GlobalState } from "../../reducers/rootReducer";
import LoadingButton from "../../components/LoadingButton";
import { getUserInfo, setPreferencesFlag } from "../../actions/userInfoActions";

function About() {
  const movieSearchResult: any = useSelector<GlobalState>(
    (state) => state.tmdbData.movieSearchResult
  );

  const userData: any = useSelector<GlobalState>((state) => state.userInfo);

  const dispatch = useDispatch();

  useEffect(() => {
    console.log(userData);
  }, [userData]);

  return (
    <div>
      <LoadingButton
        onClick={() => {
          dispatch(getUserInfo("test@test.test"));
        }}
        loading={false}
      >
        Get User Info
      </LoadingButton>

      <LoadingButton
        onClick={() => {
          dispatch(setPreferencesFlag("test@test.test", false));
        }}
        loading={false}
      >
        Put Flag
      </LoadingButton>
      {movieSearchResult.results
        ? movieSearchResult.results.map((e: any, index: number) => (
            <div key={index}>{e.title + ": " + e.vote_average}</div>
          ))
        : "no movie search data"}
    </div>
  );
}

export default About;
