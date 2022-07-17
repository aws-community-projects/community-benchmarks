let url = '';

const getUrl = async () => {
  if (url) {
    return url;
  }
  const response = await fetch('./config.json');
  url = `${
    (await response.json())['matt-community-benchmarks-BenchmarkMachineStack']
      .BenchmarkStateMachineBenchmarkUrlC4F2BF06
  }/benchmarks`;
  return url;
};

export const getBenchmarks = async () => {
  const result = await fetch(await getUrl());

  return await result.json();
};
