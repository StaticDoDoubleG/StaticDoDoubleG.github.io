# 5. CNNs, Transfer Learning, and Self-Supervised Learning

## 1. Why MLPs Struggle with Images

이미지를 MLP에 넣으려면 2차원 구조를 긴 벡터로 펼쳐야 한다. 그러면 가까운 픽셀의 공간적 관계가 구조적으로 표현되지 않고 모든 입력과 모든 뉴런을 연결해 파라미터 수가 커진다. 객체가 조금 이동했을 때 같은 패턴이라는 성질도 모델이 직접 배워야 한다.

## 2. Core Ideas of CNNs

CNN은 이미지의 공간 구조를 보존하며 지역 특징을 추출한다.

- **Local connectivity**: 작은 영역만 바라본다.
- **Parameter sharing**: 같은 필터를 이미지 전체에 적용한다.
- **Translation tolerance**: 특징이 조금 이동해도 검출할 수 있다.

필터가 이미지 위를 이동하며 내적을 계산하면 feature map이 만들어진다. 초기 필터는 모서리나 방향을, 깊은 층은 질감·부분·객체를 나타내는 패턴을 조합한다.

## 3. CNN Components

일반적인 흐름은 다음과 같다.

```text
Input -> Convolution -> ReLU -> Pooling -> 반복 -> Fully Connected -> Softmax
```

- **Kernel/filter**: 한 번에 볼 영역과 학습할 패턴
- **Stride**: 필터가 이동하는 간격
- **Padding**: 가장자리에 값을 추가해 출력 크기와 경계 정보를 보존
- **Receptive field**: 한 출력이 영향을 받는 입력 영역
- **Max pooling**: 영역에서 가장 큰 활성화를 선택
- **Average pooling**: 영역의 평균을 선택
- **Fully connected**: 추출된 특징을 결합해 최종 과제를 수행

컬러 이미지는 RGB 세 채널을 가지므로 필터는 채널 방향 정보까지 함께 처리한다.

## 4. Transfer Learning

대규모 데이터셋의 원천 과제에서 사전학습한 모델을 새로운 목표 과제에 재사용한다. 첫 층의 모서리·질감 같은 특징은 여러 이미지 과제에 공통이므로 처음부터 모든 층을 학습할 필요가 없다.

일반적인 방법은 다음과 같다.

1. 사전학습 모델의 초반 특징 추출 층을 가져온다.
2. 기존 출력층을 목표 클래스 수에 맞는 층으로 교체한다.
3. 데이터가 적으면 초기 층을 freeze하고 새 출력층만 학습한다.
4. 데이터가 충분하면 일부 뒤쪽 층까지 작은 학습률로 fine-tuning한다.

원천 데이터와 목표 데이터가 너무 다르면 사전학습 특징이 맞지 않을 수 있고, 목표 데이터가 적은데 전체 모델을 크게 업데이트하면 과적합할 수 있다.

## 5. Why Self-Supervised Learning Matters

이미지·텍스트·영상에는 라벨 없는 데이터가 훨씬 많다. 사람이 모든 샘플에 라벨을 붙이는 비용이 크므로, 데이터 자체에서 학습 문제를 만든다. 학습이 끝난 표현은 분류·검색·검출 같은 downstream task에 재사용할 수 있다.

### Generative and Predictive Methods

입력 일부를 숨기고 복원 또는 예측한다.

- Autoencoder: 입력을 압축했다가 복원
- GPT: 앞의 토큰으로 다음 토큰 예측
- MAE: 이미지 패치 대부분을 가리고 복원
- Jigsaw: 섞인 이미지 패치의 원래 순서 예측

### Contrastive Methods

같은 샘플에서 만든 두 변형은 표현 공간에서 가깝게, 다른 샘플은 멀게 만든다. SimCLR, MoCo, Barlow Twins 등이 대표적이다. augmentation이 의미를 보존하는 방식이어야 positive pair가 올바른 학습 신호가 된다.

## 6. Applications and Challenges

CNN과 그 확장 구조는 이미지 분류, 객체 검출, 세그멘테이션, 3D 비전, vision-language 모델에 사용된다. 자기지도 사전학습은 NLP와 비전 모두에서 대규모 무라벨 데이터를 활용하는 기반이 되었다.

주요 과제는 데이터 편향과 공정성, 대규모 학습의 에너지 비용, 모델 판단의 해석 가능성과 신뢰성이다.
